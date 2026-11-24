const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('AC-8 MCP stdio advertises project tools and requires a session for them', () => {
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'my_bookings', arguments: {} } }
  ];
  const run = spawnSync(process.execPath, ['mcp-server/server.js'], {
    input: messages.map(JSON.stringify).join('\n') + '\n', encoding: 'utf8',
    env: { ...process.env, MCP_TOKEN: '' }, timeout: 10000
  });
  assert.equal(run.status, 0, run.stderr);
  const replies = run.stdout.trim().split('\n').map(JSON.parse);
  assert.deepEqual(replies.find(({ id }) => id === 1).result.tools.map(({ name }) => name),
    ['find_lecture', 'list_lectures', 'list_free_slots', 'my_bookings', 'book_slot']);
  const denied = replies.find(({ id }) => id === 2).result;
  assert.equal(denied.isError, true);
  assert.match(denied.content[0].text, /session token/);
});
