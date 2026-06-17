import { shell } from 'electron';
import { createServer } from 'http';
import axios from 'axios';
import { generatePKCE } from './utils';

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

const LOOPBACK_PORT = 9004;
const REDIRECT_URI = `http://127.0.0.1:${LOOPBACK_PORT}`;
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.upload',
];

// Holds the pending auth callbacks while we wait for the loopback redirect.
let pendingAuth: {
  resolve: (user: { name: string; email: string }) => void;
  reject: (err: Error) => void;
  codeVerifier: string;
  codeChallenge: string;
} | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  if (!clientId || !clientSecret) {
    throw new Error('Google Client ID or Client Secret missing');
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

async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const { clientId, clientSecret } = getCredentials();

  const { data: tokens } = await axios.post(
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

  if (tokens.error) {
    throw new Error(
      `Token exchange failed: ${tokens.error_description ?? tokens.error}`
    );
  }

  return tokens as {
    access_token: string;
    refresh_token: string;
    id_token: string;
  };
}

function decodeIdToken(idToken: string): { name: string; email: string } {
  // JWT payload is the middle segment, base64url-encoded.
  const payload = JSON.parse(
    Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')
  );
  return { name: payload.name, email: payload.email };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function startLoopbackServer(): void {
  const server = createServer(async (req, res) => {
    if (!req.url) return;

    const code = new URL(req.url, `http://127.0.0.1:${LOOPBACK_PORT}`).searchParams.get('code');

    // Respond to the browser so it doesn't hang
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(AUTH_SUCCESS_HTML);
    server.close();

    if (!pendingAuth) return;
    const { resolve, reject, codeVerifier } = pendingAuth;
    pendingAuth = null;

    try {
      if (!code) throw new Error('No auth code in redirect');
      const tokens = await exchangeCodeForTokens(code, codeVerifier);
      const user = decodeIdToken(tokens.id_token);

      console.log(user);
      
      // TODO: persist tokens.refresh_token securely (e.g. electron-store / keytar)
      resolve(user);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

  server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
    if (!pendingAuth) return;
    const authUrl = buildAuthUrl(pendingAuth.codeChallenge);
    shell.openExternal(authUrl);
  });

  server.on('error', (err) => {
    pendingAuth?.reject(err);
    pendingAuth = null;
  });
}

export function startGoogleAuth(): Promise<{ name: string; email: string }> {
  return new Promise((resolve, reject) => {
    const { codeVerifier, codeChallenge } = generatePKCE();
    pendingAuth = { resolve, reject, codeVerifier, codeChallenge };
    startLoopbackServer();
  });
}
