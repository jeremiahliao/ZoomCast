import { createHash, randomBytes } from 'crypto';

export function generatePKCE() {
  const codeVerifier = randomBytes(64).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}