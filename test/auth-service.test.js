const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { authService, hashPassword } = require('../src/services/auth');

test('local authentication normalizes email and stores only a hash of the session token', async () => {
  const existing = { id: 7, password_hash: await hashPassword('sample local password') };
  let saved;
  let deleted;
  const auth = authService({
    byEmail: async (address) => address === 'student@example.test' ? existing : undefined,
    saveSession: async (...args) => { saved = args; },
    userForSession: async (hash) => hash === saved[0] ? { id: 7 } : undefined,
    deleteSession: async (hash) => { deleted = hash; }
  });
  assert.equal(await auth.login('student@example.test', 'incorrect'), null);
  assert.equal(await auth.login('unknown@example.test', 'incorrect'), null);
  const token = await auth.login(' STUDENT@example.test ', 'sample local password');
  const digest = createHash('sha256').update(token).digest('hex');
  assert.deepEqual(saved, [digest, 7]);
  assert.notEqual(digest, token);
  assert.deepEqual(await auth.current(token), { id: 7 });
  assert.equal(await auth.current('malformed'), null);
  await auth.logout();
  assert.equal(deleted, undefined);
  await auth.logout(token);
  assert.equal(deleted, digest);
});

test('invalid credentials are rejected before any database lookup', async () => {
  const auth = authService({ byEmail: async () => assert.fail('Invalid values should not reach storage') });
  for (const args of [[null, 'sample'], ['student@example.test', null], ['a'.repeat(255), 'a'], ['a', 'a'.repeat(257)]]) {
    assert.equal(await auth.login(...args), null);
  }
});

test('provider sign-in issues the same type of session and rejects ambiguous identities', async () => {
  let saved;
  const auth = authService({
    byGoogle: async ({ subject }) => subject === 'known' ? { id: 3 } : undefined,
    saveSession: async (...args) => { saved = args; }
  });
  assert.equal(await auth.providerLogin({ subject: 'ambiguous' }), null);
  const token = await auth.providerLogin({ subject: 'known' });
  assert.deepEqual(saved, [createHash('sha256').update(token).digest('hex'), 3]);
});
