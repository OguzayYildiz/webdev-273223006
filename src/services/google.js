const { createHmac, randomBytes, timingSafeEqual, createHash } = require('node:crypto');
const { ServiceError } = require('./booking');

function googleSignIn({ clientId, clientSecret, sessionSecret, baseUrl, fetcher = fetch, now = Date.now } = {}) {
  if (!clientId || !clientSecret || !sessionSecret || !baseUrl) return null;
  const callback = new URL('/auth/google/callback', baseUrl).href;
  const sign = (value) => createHmac('sha256', sessionSecret).update(value).digest('hex');
  const failure = () => new ServiceError(400, 'Google sign-in could not be verified. Return to sign-in and try again.');

  function begin() {
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const packed = Buffer.from(JSON.stringify({ state, verifier, expires: now() + 300000 })).toString('base64url');
    const query = new URLSearchParams({
      client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'openid email',
      state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256'
    });
    return { url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query, pending: packed + '.' + sign(packed) };
  }

  async function profile({ state, code, pending }) {
    if (!state || !code || !pending) throw failure();
    const [packed, signature, extra] = pending.split('.');
    if (extra !== undefined || !/^[a-f0-9]{64}$/.test(signature ?? '') ||
      !timingSafeEqual(Buffer.from(sign(packed), 'hex'), Buffer.from(signature, 'hex'))) throw failure();
    const saved = JSON.parse(Buffer.from(packed, 'base64url').toString());
    if (saved.state !== state || saved.expires <= now()) throw failure();

    try {
      const signal = AbortSignal.timeout(6000);
      const token = await fetcher('https://oauth2.googleapis.com/token', {
        method: 'POST', signal, body: new URLSearchParams({
          code, code_verifier: saved.verifier, client_id: clientId, client_secret: clientSecret,
          redirect_uri: callback, grant_type: 'authorization_code'
        })
      });
      if (!token.ok) throw failure();
      const { access_token: accessToken } = await token.json();
      if (typeof accessToken !== 'string' || !accessToken) throw failure();
      const response = await fetcher('https://openidconnect.googleapis.com/v1/userinfo', {
        signal, headers: { authorization: 'Bearer ' + accessToken }
      });
      if (!response.ok) throw failure();
      const user = await response.json();
      if (user.email_verified !== true || typeof user.sub !== 'string' || !user.sub ||
        typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(user.email) || user.email.length > 254) {
        throw failure();
      }
      return { subject: user.sub, email: user.email.toLowerCase() };
    } catch {
      throw failure();
    }
  }

  return { begin, profile };
}

module.exports = { googleSignIn };
