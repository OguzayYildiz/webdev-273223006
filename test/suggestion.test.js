const { test } = require('node:test');
const assert = require('node:assert/strict');
const { geminiClient, suggestionService } = require('../src/services/suggestion');

const user = { id: 123, email: 'private-account@example.test' };
const date = '2030-06-04';
const selection = { date, preference: 'Before noon' };
const availableSlots = { workstations: [{ id: 4, label: 'A-04', slots: [
  { hour: 9, available: true }, { hour: 10, available: false }
] }] };
const booking = { slots: async () => availableSlots };

test('AC-7 only current free slots are offered, without account fields', async () => {
  const fakeClient = async ({ preference, candidates }) => {
    assert.equal(preference, 'Before noon');
    assert.deepEqual(candidates, [{ id: '4-9', workstation: 'A-04', hour: 9, date }]);
    return '4-9';
  };
  const suggest = suggestionService(booking, fakeClient);
  assert.deepEqual(await suggest(user, 1, selection), {
    suggestion: { id: '4-9', workstationId: 4, workstation: 'A-04', hour: 9, date }
  });
});

test('AC-7 timeout, missing configuration, invalid output and provider failure preserve manual choice', async () => {
  const fakeClients = [
    null, async () => '4-10', async () => ({ id: '4-9' }), async () => { throw new Error('rate-limited'); }, () => new Promise(() => {})
  ];
  for (const client of fakeClients) {
    const result = await suggestionService(booking, client, { timeout: 5 })(user, 1, selection);
    assert.equal(result.suggestion, null);
    assert.match(result.message, /select a slot yourself/i);
  }
});

test('AC-7 a slot taken while the model was running is never presented as available', async () => {
  let reads = 0;
  const changing = { slots: async () => ++reads === 1 ? availableSlots : { workstations: [] } };
  const result = await suggestionService(changing, async () => '4-9')(user, 1, selection);
  assert.equal(result.suggestion, null);
});

test('the Gemini adapter sends candidate data using the configured model and interprets the reply', async () => {
  const fakeClient = async (url, request) => {
    assert.match(url, /test-model:generateContent$/);
    assert.equal(request.headers['x-goog-api-key'], 'demo');
    const [message] = JSON.parse(request.body).contents;
    assert.deepEqual(JSON.parse(message.parts[0].text), { preference: 'Morning', candidates: [{ id: '4-9' }] });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '4-9' }] } }] }) };
  };
  const client = geminiClient({ key: 'demo', model: 'test-model', fetcher: fakeClient });
  assert.equal(await client({ preference: 'Morning', candidates: [{ id: '4-9' }] }), '4-9');
});

test('invalid preferences, missing slots and malformed provider responses use the fallback', async () => {
  const fakeClient = async () => assert.fail('Do not send an invalid or empty candidate set');
  const suggest = suggestionService(booking, fakeClient);
  for (const preference of [null, ' ', 'a'.repeat(201)]) {
    assert.equal((await suggest(user, 1, { date, preference })).suggestion, null);
  }
  const empty = suggestionService({ slots: async () => ({ workstations: [] }) }, fakeClient);
  assert.equal((await empty(user, 1, selection)).suggestion, null);
  assert.equal((await suggestionService(booking, async () => undefined)(user, 1, selection)).suggestion, null);
  const adapter = geminiClient({ key: 'demo', fetcher: async () => ({ ok: false }) });
  await assert.rejects(adapter({ preference: 'Morning', candidates: [] }), /Model request failed/);
  for (const response of [{}, { candidates: [{}] }, { candidates: [{ content: {} }] }, { candidates: [{ content: { parts: [] } }] }]) {
    const client = geminiClient({ key: 'demo', fetcher: async () => ({ ok: true, json: async () => response }) });
    assert.equal(await client({ preference: 'Morning', candidates: [] }), undefined);
  }
  let reads = 0;
  const changing = { slots: async () => ++reads === 1
    ? availableSlots : { workstations: [{ id: 4, label: 'A-04', slots: [{ hour: 10, available: true }, { hour: 9, available: false }] }] } };
  assert.equal((await suggestionService(changing, async () => '4-9')(user, 1, selection)).suggestion, null);
});
