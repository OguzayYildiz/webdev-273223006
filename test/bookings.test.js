const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { openDatabase, migrate } = require('../src/data/database');
const { hashPassword } = require('../src/services/auth');
const { createApp } = require('../src/app');

const date = '2030-06-04';
const now = () => new Date('2030-06-03T06:30:00Z');
let db, server, base, first, second, staff;

async function request(path, { method = 'GET', cookie, value, origin } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  if (value) headers['content-type'] = 'application/json';
  return fetch(base + path, { method, headers, body: value ? JSON.stringify(value) : undefined, redirect: 'manual' });
}

async function login(email) {
  const response = await request('/login', { method: 'POST', value: { email, password: 'a local test password' } });
  assert.equal(response.status, 303);
  return response.headers.get('set-cookie').split(';')[0];
}
const book = (cookie, hour, workstationId = 1, when = date) =>
  request('/api/bookings', { cookie, method: 'POST', value: { workstationId, date: when, hour } });

before(async () => {
  db = await openDatabase();
  await migrate(db);
  await migrate(db);
  const hash = await hashPassword('a local test password');
  await db.query(`INSERT INTO users (email, password_hash, role) VALUES
    ('one@example.test', $1, 'student'), ('two@example.test', $1, 'student'), ('staff@example.test', $1, 'staff')`, [hash]);
  await db.query("INSERT INTO labs (name, location) VALUES ('Lab A', 'Building A'), ('Lab B', 'Building B')");
  await db.query("INSERT INTO workstations (lab_id, label) VALUES (1, 'A-01'), (1, 'A-02')");
  server = createApp(db, {
    now, publicBaseUrl: 'https://app.example.test', secure: true,
    google: {
      clientId: 'test-client', clientSecret: 'test-secret', sessionSecret: 'temporary-test-signing-key',
      fetcher: async (url) => ({ ok: true, json: async () => url.endsWith('/token')
        ? { access_token: 'test-access' }
        : { sub: 'provider-one', email: 'one@example.test', email_verified: true } })
    }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  [first, second, staff] = await Promise.all(['one@example.test', 'two@example.test', 'staff@example.test'].map(login));
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
});

test('AC-1 real workstations have weekday slot availability', async () => {
  const response = await request('/api/labs/1/slots?date=' + date, { cookie: first });
  assert.equal(response.status, 200);
  const { workstations } = await response.json();
  assert.deepEqual(workstations.map(({ label }) => label), ['A-01', 'A-02']);
  assert.deepEqual(workstations[0].slots.map(({ hour }) => hour), [9, 10, 11, 12, 13, 14, 15, 16]);
  assert.ok(workstations[0].slots.every(({ available }) => available));
  const weekend = await request('/api/labs/1/slots?date=2030-06-08', { cookie: first });
  assert.deepEqual((await weekend.json()).workstations, []);
});

test('AC-2 AC-3 simultaneous requests create one reservation and one conflict', async () => {
  const results = await Promise.all([book(first, 10), book(second, 10)]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
  const saved = await results.find((response) => response.status === 201).json();
  assert.equal(saved.workstationId, 1);
  const rows = await db.query('SELECT user_id FROM bookings WHERE hour = 10');
  assert.deepEqual(rows.rows, [{ user_id: saved.userId }]);
});

test('AC-4 AC-5 only a signed-in owner can cancel and the slot is freed', async () => {
  const created = await book(first, 11);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const path = '/api/bookings/' + id;
  const denied = await request(path, { cookie: second, method: 'DELETE' });
  assert.equal(denied.status, 403);
  const signedOut = await request(path, { method: 'DELETE' });
  assert.equal(signedOut.status, 401);
  const owned = await request('/api/bookings/mine', { cookie: first });
  assert.ok((await owned.json()).some((row) => row.id === id));
  const before = await request('/api/labs/1/slots?date=' + date, { cookie: second });
  assert.deepEqual((await before.json()).workstations[0].slots[2], { hour: 11, available: false, booked: true, bookingId: null });
  const cancelled = await request(path, { cookie: first, method: 'DELETE' });
  assert.equal(cancelled.status, 204);
  const after = await request('/api/labs/1/slots?date=' + date, { cookie: first });
  assert.equal((await after.json()).workstations[0].slots[2].available, true);
});

test('AC-6 staff can manage labs and review bookings by date', async () => {
  const value = { name: 'Lab C', location: 'Building C' };
  assert.equal((await request('/api/staff/labs', { method: 'POST', cookie: first, value })).status, 403);
  const lab = await request('/api/staff/labs', { method: 'POST', cookie: staff, value });
  assert.equal(lab.status, 201);
  const { id } = await lab.json();
  const workstation = await request('/api/staff/labs/' + id + '/workstations', {
    method: 'POST', cookie: staff, value: { label: 'C-01' }
  });
  assert.equal(workstation.status, 201);
  const created = await book(first, 12, (await workstation.json()).id);
  assert.equal(created.status, 201);
  const list = await request('/api/staff/bookings?date=' + date, { cookie: staff });
  assert.equal(list.status, 200);
  assert.ok((await list.json()).some((row) => row.lab === 'Lab C'));
});

test('invalid dates, unknown workstations and cross-site writes are rejected', async () => {
  assert.equal((await book(first, 9, 1, '2030-02-31')).status, 422);
  assert.equal((await book(first, 9, 1, '2030-06-08')).status, 422);
  assert.equal((await book(first, 9, 1, '2030-06-03')).status, 422);
  assert.equal((await book(first, 9, 999)).status, 404);
  assert.equal((await request('/api/bookings', {
    method: 'POST', cookie: first, origin: 'https://example.test',
    value: { workstationId: 1, date, hour: 9 }
  })).status, 403);
});

test('booking screens serve meaningful headings and the staff page is protected', async () => {
  const lab = await request('/labs/1', { cookie: first });
  assert.equal(lab.status, 200);
  assert.match(await lab.text(), /<h1>Lab A<\/h1>[\s\S]*id="day"[\s\S]*role="status"/);
  const mine = await request('/bookings', { cookie: first });
  assert.match(await mine.text(), /<h1>My bookings<\/h1>/);
  assert.equal((await request('/staff', { cookie: first })).status, 403);
  const management = await request('/staff', { cookie: staff });
  assert.match(await management.text(), /Add a workstation/);
  const script = await request('/assets/booking.js');
  assert.match(script.headers.get('content-type'), /text\/javascript/);
});

test('AC-8 MCP tools use an ordinary session and the same booking rules as HTTP', async () => {
  const { createProjectTools } = require('../mcp-server/project-tools');
  const { identity } = require('../src/data/identity');
  const { authService } = require('../src/services/auth');
  const { bookingData } = require('../src/data/bookings');
  const { bookingService } = require('../src/services/booking');
  const services = { auth: authService(identity(db)), booking: bookingService(bookingData(db), { now }) };
  const load = async () => services;
  const call = createProjectTools(load, { token: first.slice(4) }).call;
  const denied = createProjectTools(load, { token: '' }).call;
  const expired = createProjectTools(load, { token: '0'.repeat(64) }).call;
  assert.equal((await denied('my_bookings', {})).isError, true);
  assert.equal((await expired('my_bookings', {})).isError, true);
  const params = { labId: 1, date };
  const before = JSON.parse((await call('list_free_slots', params)).content[0].text);
  assert.ok(before.slots.some((slot) => slot.workstationId === 1 && slot.hour === 15));
  const result = await call('book_slot', { workstationId: 1, date, hour: 15 });
  assert.equal(result.isError, false);
  const created = JSON.parse(result.content[0].text);
  const after = JSON.parse((await call('list_free_slots', params)).content[0].text);
  assert.ok(!after.slots.some((slot) => slot.workstationId === 1 && slot.hour === 15));
  assert.equal((await book(second, 15)).status, 409);
  assert.equal((await call('book_slot', { workstationId: 1, date, hour: 15 })).isError, true);
  const mine = JSON.parse((await call('my_bookings', {})).content[0].text);
  assert.ok(mine.some((row) => row.id === created.id));
  assert.ok(mine.every((row) => row.userId === created.userId));
});

test('AC-7 authenticated suggestion endpoint leaves manual booking available with no key', async () => {
  const response = await request('/api/labs/1/suggestion', {
    method: 'POST', cookie: first, value: { date, preference: 'Afternoon' }
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.suggestion, null);
  assert.match(result.message, /select a slot yourself/i);
});

test('a verified provider sign-in keeps the existing account and session rules', async () => {
  const health = await request('/health');
  assert.deepEqual(await health.json(), { status: 'ok', db: 'ok' });
  const page = await request('/login');
  assert.match(await page.text(), /Sign in with Google/);
  const start = await request('/auth/google');
  assert.equal(start.status, 302);
  const provider = new URL(start.headers.get('location'));
  assert.equal(provider.hostname, 'accounts.google.com');
  const state = provider.searchParams.get('state');
  const pending = start.headers.get('set-cookie').split(';')[0];
  const failure = await request('/auth/google/callback?code=demo&state=invalid', { cookie: pending });
  assert.equal(failure.status, 400);
  const result = await request('/auth/google/callback?code=demo&state=' + encodeURIComponent(state), { cookie: pending });
  assert.equal(result.status, 303);
  const session = result.headers.getSetCookie().find((value) => value.startsWith('sid='));
  assert.match(session, /HttpOnly.*SameSite=Lax.*Secure/);
  const rows = await db.query("SELECT id, google_subject FROM users WHERE email = 'one@example.test'");
  assert.deepEqual(rows.rows, [{ id: 1, google_subject: 'provider-one' }]);
  const signedIn = await request('/labs', { cookie: session.split(';')[0] });
  assert.equal(signedIn.status, 200);
  const out = await request('/logout', { cookie: session.split(';')[0], method: 'POST' });
  assert.equal(out.status, 303);
  assert.equal((await request('/api/labs', { cookie: session.split(';')[0] })).status, 401);
});

test('health becomes unavailable when the database is unreachable, without exposing internal errors', async () => {
  const unavailable = createApp({ query: async () => { throw new Error('test-only internal database error'); } })
    .listen(0, '127.0.0.1');
  try {
    await once(unavailable, 'listening');
    const response = await fetch('http://127.0.0.1:' + unavailable.address().port + '/health');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: 'unavailable', db: 'unavailable' });
  } finally {
    await new Promise((resolve) => unavailable.close(resolve));
  }
});
