const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { openDatabase, migrate } = require('../src/data/database');
const { hashPassword } = require('../src/services/auth');
const { createApp } = require('../src/app');

let db, server, base;
before(async () => {
  db = await openDatabase();
  await migrate(db);
  const hash = await hashPassword('a local test password');
  await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', ['student@example.test', hash]);
  await db.query("INSERT INTO labs (name, location) VALUES ('Lab A-204', 'Building A'), ('Lab B-108', 'Building B')");
  server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (db) await db.close();
});

test('AC-9 signed-out visitors cannot see labs or their API data', async () => {
  const page = await fetch(base + '/labs', { redirect: 'manual' });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get('location'), '/login');
  const api = await fetch(base + '/api/labs');
  assert.equal(api.status, 401);
  assert.deepEqual(await api.json(), { error: 'Sign in to see labs.' });
});

test('AC-10 seeded student signs in and sees real lab rows', async () => {
  const login = await fetch(base + '/login', {
    method: 'POST', body: new URLSearchParams({ email: 'student@example.test', password: 'a local test password' }),
    redirect: 'manual'
  });
  assert.equal(login.status, 303);
  assert.equal(login.headers.get('location'), '/labs');
  const session = login.headers.get('set-cookie').split(';')[0];
  const response = await fetch(base + '/labs', { headers: { cookie: session } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Lab A-204[\s\S]*Building A/);
  assert.match(html, /Lab B-108/);
});

test('AC-11 removing one lab changes the rendered list on reload', async () => {
  const login = await fetch(base + '/login', {
    method: 'POST', body: new URLSearchParams({ email: 'student@example.test', password: 'a local test password' }),
    redirect: 'manual'
  });
  assert.equal(login.status, 303);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  await db.query('DELETE FROM labs WHERE name = $1', ['Lab A-204']);
  const response = await fetch(base + '/labs', { headers: { cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /Lab A-204/);
  assert.match(html, /Lab B-108/);
});
