import { shell } from 'electron';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import axios from 'axios';
import Store from 'electron-store';
import * as keytar from 'keytar';
import { generatePKCE } from './utils';

// ─── Config ──────────────────────────────────────────────────────────────────

const LOOPBACK_PORT     = 9004;
const REDIRECT_URI      = `http://127.0.0.1:${LOOPBACK_PORT}`;
const KEYTAR_SERVICE    = 'ZoomCast';
const KEYTAR_ACCOUNT    = 'refresh_token';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.upload',
];

const AUTH_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Signed In</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: #0f0f0f;
        color: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .card {
        text-align: center;
        padding: 2.5rem 3rem;
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        max-width: 360px;
        width: 100%;
      }
      .icon { font-size: 2.5rem; margin-bottom: 1rem; }
      h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.5rem; }
      p { font-size: 0.9rem; color: #888; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✅</div>
      <h1>Signed in successfully</h1>
      <p>You can close this tab and return to the app.</p>
    </div>
  </body>
</html>`;


// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreSchema {
  user: User | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null; // Unix ms
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number; // seconds
  error?: string;
  error_description?: string;
}

// ─── Persistent store ────────────────────────────────────────────────────────

const store = new Store<StoreSchema>({
  defaults: {
    user: null,
    accessToken: null,
    accessTokenExpiresAt: null,
  },
});

// ─── Refresh timer ───────────────────────────────────────────────────────────

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(expiresAt: number): void {
  if (refreshTimer) clearTimeout(refreshTimer);

  const delay = Math.max(0, expiresAt - Date.now() - REFRESH_BUFFER_MS);

  refreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (err) {
      console.error('[auth] Background token refresh failed:', err);
    }
  }, delay);
}

// ─── OAuth helpers ───────────────────────────────────────────────────────────

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
  }
  return { clientId, clientSecret };
}

function buildAuthUrl(codeChallenge: string): string {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function decodeIdToken(idToken: string): User {
  const payload = JSON.parse(
    Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')
  );
  return { name: payload.name, email: payload.email };
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getCredentials();

  const { data } = await axios.post<TokenResponse>(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  if (data.error) {
    throw new Error(`Token exchange failed: ${data.error_description ?? data.error}`);
  }

  return data;
}

// ─── Session persistence ─────────────────────────────────────────────────────

async function persistSession(
  tokens: TokenResponse,
  user?: User
): Promise<void> {
  const expiresAt = Date.now() + tokens.expires_in * 1000;

  store.set('accessToken', tokens.access_token);
  store.set('accessTokenExpiresAt', expiresAt);
  if (user) store.set('user', user);

  if (tokens.refresh_token) {
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, tokens.refresh_token);
  }

  scheduleRefresh(expiresAt);
}

function isTokenFresh(expiresAt: number | null): boolean {
  return expiresAt !== null && expiresAt > Date.now() + REFRESH_BUFFER_MS;
}

// ─── Loopback server (OAuth redirect handler) ─────────────────────────────────

const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const enum CancelReason { TIMEOUT, NEW_ATTEMPT }

let pendingAuth: {
  resolve: (user: User | null) => void;
  reject: (err: Error) => void;
  codeVerifier:  string;
  codeChallenge: string;
} | null = null;

let loopbackServer: ReturnType<typeof createServer> | null = null;
let authTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPendingAuth(source: CancelReason, reason: string,): void {
  if (authTimeoutTimer) {
    clearTimeout(authTimeoutTimer);
    authTimeoutTimer = null;
  }
  if (loopbackServer) {
    loopbackServer.close();
    loopbackServer = null;
  }
  if (pendingAuth) {
    if (source == CancelReason.TIMEOUT) {
      // only reject if timeout
      pendingAuth.reject(new Error(reason));
    } else {
      // silent cancellation — resolve with null so the caller just does nothing
      pendingAuth.resolve(null);
    }
    pendingAuth = null;
  }
}

function startLoopbackServer(): void {
  const server = createServer();
  loopbackServer = server;

  server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
    if (!pendingAuth) return;
    shell.openExternal(buildAuthUrl(pendingAuth.codeChallenge));

    // Reject if the user closes the browser without completing sign-in
    authTimeoutTimer = setTimeout(() => {
      cancelPendingAuth(CancelReason.TIMEOUT, 'Sign-in was not completed. Please try again.');
    }, AUTH_TIMEOUT_MS);
  });

  server.on('request', async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) return;

    const code = new URL(req.url, REDIRECT_URI).searchParams.get('code');

    // Respond to the browser immediately so it doesn't hang
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(AUTH_SUCCESS_HTML);

    if (authTimeoutTimer) {
      clearTimeout(authTimeoutTimer);
      authTimeoutTimer = null;
    }
    server.close();
    loopbackServer = null;

    if (!pendingAuth) return;
    const { resolve, reject, codeVerifier } = pendingAuth;
    pendingAuth = null;

    try {
      if (!code) throw new Error('No auth code received in redirect');

      // get tokens
      const response = await exchangeCodeForTokens(code, codeVerifier);
      if (!response.id_token) throw new Error('No ID token in response');
      const user = decodeIdToken(response.id_token);

      // store session information
      await persistSession(response, user);
      
      resolve(user);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

  server.on('error', (err: Error) => {
    if (authTimeoutTimer) {
      clearTimeout(authTimeoutTimer);
      authTimeoutTimer = null;
    }
    loopbackServer = null;
    pendingAuth?.reject(err);
    pendingAuth = null;
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Open the Google OAuth consent screen and return the signed-in user. */
export function startGoogleAuth(): Promise<User | null> {
  // If a previous auth attempt is still pending (e.g. user closed the browser),
  // cancel it cleanly before starting a new one.
  if (pendingAuth) {
    cancelPendingAuth(CancelReason.NEW_ATTEMPT, 'Sign-in cancelled — a new sign-in attempt was started.');
  }

  return new Promise((resolve, reject) => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    pendingAuth = { resolve, reject, codeVerifier, codeChallenge };
    startLoopbackServer();
  });
}

/**
 * Silently exchange the stored refresh token for a new access token.
 * Automatically re-arms the refresh timer after a successful exchange.
 */
export async function refreshAccessToken(): Promise<void> {
  const { clientId, clientSecret } = getCredentials();
  const refreshToken = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);

  if (!refreshToken) {
    throw new Error('No refresh token stored — user must sign in again');
  }

  const { data } = await axios.post<TokenResponse>(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description ?? data.error}`);
  }

  // Google only issues a new refresh token if rotation is enabled; preserve the old one otherwise
  await persistSession(data);
  console.log('[auth] Access token refreshed');
}

/**
 * Restore a previous session on app startup.
 * Silently refreshes the access token if it has expired.
 * Returns null if no session exists or the refresh token has been revoked.
 */
export async function restoreSession(): Promise<User | null> {
  const user = store.get('user');
  const expiresAt = store.get('accessTokenExpiresAt');
  const refreshToken = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);

  if (!user || !refreshToken) return null;

  if (isTokenFresh(expiresAt)) {
    scheduleRefresh(expiresAt as number);
    return user;
  }

  // Token expired or close to expiry — refresh silently
  try {
    await refreshAccessToken();
    return user;
  } catch {
    // Refresh token revoked or invalid — force re-login
    console.error("Token refresh failed. Clearing session.");
    await clearSession();
    return null;
  }
}

/**
 * Return a valid access token, refreshing first if it's close to expiry.
 * Use this whenever you need to make a YouTube API call.
 */
export async function getAccessToken(): Promise<string> {
  const accessToken = store.get('accessToken');
  const expiresAt   = store.get('accessTokenExpiresAt');

  if (!accessToken) throw new Error('No access token — user must sign in');

  if (!isTokenFresh(expiresAt)) {
    await refreshAccessToken();
    return store.get('accessToken') as string;
  }

  return accessToken;
}

/** Clear all session data and cancel the scheduled refresh. */
export async function clearSession(): Promise<void> {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  store.set('user', null);
  store.set('accessToken', null);
  store.set('accessTokenExpiresAt', null);
  await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
}
