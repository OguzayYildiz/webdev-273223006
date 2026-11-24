const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bookingService } = require('../src/services/booking');

const user = { id: 1, role: 'student' };
const now = () => new Date('2030-06-03T09:30:00Z');

test('AC-3 duplicate database constraints become an understandable conflict', async () => {
  const data = { create: async () => { throw Object.assign(new Error(), { code: '23505' }); } };
  await assert.rejects(bookingService(data, { now }).book(user,
    { workstationId: 1, date: '2030-06-03', hour: 14 }), { status: 409 });
});

test('a slot that already started today in Sofia is rejected by the service', async () => {
  const data = { create: async () => assert.fail('Unavailable slots must not be saved') };
  await assert.rejects(bookingService(data, { now }).book(user,
    { workstationId: 1, date: '2030-06-03', hour: 12 }), { status: 422 });
});

const staff = { id: 2, role: 'staff' };
const monday = '2030-06-03';
const tuesday = '2030-06-04';
const failure = (code) => Object.assign(new Error('database error'), { code });

test('date, workstation ID and hours are validated before storage', async () => {
  const rules = bookingService({ create: async () => assert.fail('Invalid input reached storage') }, { now });
  const book = (changes) => rules.book(user, { date: tuesday, workstationId: 1, hour: 14, ...changes });
  for (const date of [null, 'June 4', '0000-06-04', '2030-13-01', '2030-02-31', '2030-06-02', '2030-06-01', '2030-05-31']) {
    await assert.rejects(book({ date }), { status: 422 });
  }
  for (const workstationId of [1.5, 0, 2147483648]) {
    await assert.rejects(book({ workstationId }), { status: 422 });
  }
  await assert.rejects(book({ hour: 17 }), { status: 422 });
});

test('availability masks other owners and distinguishes occupied and elapsed slots', async () => {
  const rows = [
    { id: 1, label: 'A-01', hour: 12, bookingId: 9, ownerId: user.id },
    { id: 1, label: 'A-01', hour: 15, bookingId: 10, ownerId: staff.id }
  ];
  const rules = bookingService({ lab: async () => ({ id: 1 }), slots: async () => rows }, { now });
  const { workstations: [{ slots }] } = await rules.slots(user, 1, monday);
  assert.equal(slots.find(({ hour }) => hour === 12).bookingId, 9);
  assert.equal(slots.find(({ hour }) => hour === 15).bookingId, null);
  assert.equal(slots.find(({ hour }) => hour === 9).available, false);
  assert.equal(slots.find(({ hour }) => hour === 13).available, true);
  assert.deepEqual((await rules.slots(user, 1, '2030-06-09')).workstations, []);
});

test('missing rooms, deleted bookings and concurrent cancellation produce a 404', async () => {
  const data = { lab: async () => undefined, owner: async (id) => id === 1 ? undefined : user.id, cancel: async () => undefined };
  const rules = bookingService(data, { now });
  await assert.rejects(rules.lab(1), { status: 404 });
  await assert.rejects(rules.cancel(user, 1), { status: 404 });
  await assert.rejects(rules.cancel(user, 2), { status: 404 });
  const unexpected = failure('unexpected');
  await assert.rejects(bookingService({ create: async () => { throw unexpected; } }, { now })
    .book(user, { date: tuesday, hour: 14, workstationId: 1 }), (error) => error === unexpected);
});

test('personal bookings include future and currently running hours', async () => {
  const owned = [{ date: monday, hour: 11 }, { date: monday, hour: 12 }, { date: tuesday, hour: 9 }];
  const rules = bookingService({ owned: async () => owned }, { now });
  assert.deepEqual(await rules.mine(user), owned.slice(1));
});

test('staff labels are trimmed and conflicts get useful responses', async () => {
  const rules = bookingService({
    lab: async () => ({ id: 1 }),
    addLab: async (name, location) => ({ name, location }),
    addWorkstation: async (id, label) => ({ id, label })
  }, { now });
  assert.deepEqual(await rules.addLab(staff, { name: ' A ', location: ' B ' }), { name: 'A', location: 'B' });
  assert.deepEqual(await rules.addWorkstation(staff, 1, { label: ' A-01 ' }), { id: 1, label: 'A-01' });
  for (const label of [null, ' ', 'a'.repeat(81)]) {
    await assert.rejects(rules.addWorkstation(staff, 1, { label }), { status: 422 });
  }
  for (const code of ['23505', 'unexpected']) {
    const error = failure(code);
    const fail = async () => { throw error; };
    const app = bookingService({ lab: async () => ({ id: 1 }), addLab: fail, addWorkstation: fail }, { now });
    const expected = code === '23505' ? { status: 409 } : (actual) => actual === error;
    await assert.rejects(app.addLab(staff, { name: 'A', location: 'B' }), expected);
    await assert.rejects(app.addWorkstation(staff, 1, { label: 'A-01' }), expected);
  }
});

test('the default booking clock uses a valid Sofia date', async () => {
  let usedDate;
  const data = { owned: async (_user, date) => { usedDate = date; return []; } };
  assert.deepEqual(await bookingService(data).mine(user), []);
  assert.match(usedDate, /^\d{4}-\d{2}-\d{2}$/);
});
