const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const derive = promisify(scrypt);
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const dummy = '00000000000000000000000000000000:' + '0'.repeat(128);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
}

function authService(data) {
  async function start(user) {
    const token = randomBytes(32).toString('hex');
    await data.saveSession(hashToken(token), user.id);
    return token;
  }

  return {
    async login(email, password) {
      if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 256) {
        return null;
      }
      const user = await data.byEmail(email.trim().toLowerCase());
      const [salt, expected] = (user?.password_hash ?? dummy).split(':');
      const actual = await derive(password, salt, 64);
      const valid = timingSafeEqual(actual, Buffer.from(expected, 'hex'));
      return user?.password_hash && valid ? start(user) : null;
    },
    async providerLogin(profile) {
      const user = await data.byGoogle(profile);
      return user ? start(user) : null;
    },
    async current(token) {
      return token && /^[a-f0-9]{64}$/.test(token) ? data.userForSession(hashToken(token)) : null;
    },
    async logout(token) {
      if (token) await data.deleteSession(hashToken(token));
    }
  };
}

module.exports = { authService, hashPassword };
