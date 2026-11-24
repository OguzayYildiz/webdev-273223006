const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { googleSignIn } = require('../src/services/google');

const config = { clientId: 'test-client', clientSecret: 'test-secret', sessionSecret: 'temporary-test-signing-key',
  baseUrl: 'https://app.example.test' };
const verified = { sub: 'test-account', email: 'Student@example.test', email_verified: true };
const makeResponse = (value, ok = true) => ({ ok, json: async () => value });

function sample(provider) {
  const { url, pending } = provider.begin();
  const query = new URL(url).searchParams;
  return { query, args: { state: query.get('state'), pending, code: 'example-code' } };
}

test('Google authorization uses PKCE and accepts verified user information', async () => {
  let challenge;
  const fakeClient = async (url, options) => {
    if (url.endsWith('/token')) {
      const verifier = options.body.get('code_verifier');
      assert.equal(createHash('sha256').update(verifier).digest('base64url'), challenge);
      assert.equal(options.body.get('redirect_uri'), 'https://app.example.test/auth/google/callback');
      assert.equal(options.body.get('code'), 'example-code');
      return makeResponse({ access_token: 'demo-access-token' });
    }
    assert.equal(options.headers.authorization, 'Bearer demo-access-token');
    return makeResponse(verified);
  };
  const provider = googleSignIn({ ...config, fetcher: fakeClient });
  const { query, args } = sample(provider);
  challenge = query.get('code_challenge');
  assert.equal(query.get('code_challenge_method'), 'S256');
  assert.deepEqual(await provider.profile(args), { subject: 'test-account', email: 'student@example.test' });
});

test('Google callbacks reject missing, modified and expired state before contacting the provider', async () => {
  let time = 5;
  const fakeClient = async () => assert.fail('Invalid states must not contact Google.');
  const provider = googleSignIn({ ...config, now: () => time, fetcher: fakeClient });
  const { args } = sample(provider);
  for (const changes of [
    { state: '' }, { code: '' }, { pending: '' }, { state: 'other' },
    { pending: args.pending + '.extra' }, { pending: 'value.no' }, { pending: 'value' },
    { pending: 'value.' + '0'.repeat(64) }
  ]) {
    await assert.rejects(provider.profile({ ...args, ...changes }), { status: 400 });
  }
  time += 300001;
  await assert.rejects(provider.profile(args), { status: 400 });
});

test('Google callbacks reject provider errors and profiles without a verified identity', async () => {
  const responses = [
    [makeResponse({}, true)],
    [makeResponse({ access_token: '' }, true)],
    [makeResponse({}, false)],
    [makeResponse({ access_token: 'token' }), makeResponse({}, false)],
    ...[
      { ...verified, email_verified: false }, { ...verified, sub: null }, { ...verified, sub: '' },
      { ...verified, email: null }, { ...verified, email: 'not-email' },
      { ...verified, email: 'a'.repeat(250) + '@x.example.test' }
    ].map((profile) => [makeResponse({ access_token: 'token' }), makeResponse(profile)])
  ];
  for (const queue of responses) {
    const provider = googleSignIn({ ...config, fetcher: async () => queue.shift() });
    await assert.rejects(provider.profile(sample(provider).args), { status: 400 });
  }
  const error = googleSignIn({ ...config, fetcher: async () => { throw new Error('timeout'); } });
  await assert.rejects(error.profile(sample(error).args), { status: 400 });
});
