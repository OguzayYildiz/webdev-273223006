const { HttpError, json, send, readBody } = require('./http');

const routes = [
  ['GET', /^\/api\/labs\/(\d+)\/slots$/, async ({ booking, user, match, url, res }) => {
    json(res, 200, await booking.slots(user, Number(match[1]), url.searchParams.get('date')));
  }],
  ['GET', /^\/api\/bookings\/mine$/, async ({ booking, user, res }) => {
    json(res, 200, await booking.mine(user));
  }],
  ['POST', /^\/api\/bookings$/, async ({ booking, user, req, res }) => {
    json(res, 201, await booking.book(user, await readBody(req)));
  }],
  ['DELETE', /^\/api\/bookings\/(\d+)$/, async ({ booking, user, match, res }) => {
    await booking.cancel(user, Number(match[1]));
    send(res, 204, '');
  }],
  ['GET', /^\/api\/staff\/bookings$/, async ({ booking, user, url, res }) => {
    json(res, 200, await booking.forDay(user, url.searchParams.get('date')));
  }],
  ['POST', /^\/api\/staff\/labs$/, async ({ booking, user, req, res }) => {
    json(res, 201, await booking.addLab(user, await readBody(req)));
  }],
  ['POST', /^\/api\/staff\/labs\/(\d+)\/workstations$/, async ({ booking, user, match, req, res }) => {
    json(res, 201, await booking.addWorkstation(user, Number(match[1]), await readBody(req)));
  }]
];

async function handleBooking(context) {
  for (const [method, pattern, handler] of routes) {
    if (context.req.method !== method) continue;
    const match = context.url.pathname.match(pattern);
    if (!match) continue;
    const user = await context.auth.current(context.token);
    if (!user) throw new HttpError(401, 'Sign in to use bookings.');
    await handler({ ...context, user, match });
    return true;
  }
  return false;
}

module.exports = { handleBooking };
