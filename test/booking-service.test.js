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
