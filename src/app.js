const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { identity } = require('./data/identity');
const { labData } = require('./data/labs');
const { authService } = require('./services/auth');
const { labService } = require('./services/labs');
const { HttpError, html, json, redirect, send, cookie, readBody } = require('./http');
const view = require('./views');
const { bookingData } = require('./data/bookings');
const { bookingService, localTime, ServiceError } = require('./services/booking');
const { handleBooking } = require('./booking-routes');
const { geminiClient, suggestionService } = require('./services/suggestion');

function createApp(db, { publicBaseUrl, secure = false, now, modelKey, modelName } = {}) {
  const auth = authService(identity(db));
  const labs = labService(labData(db));
  const booking = bookingService(bookingData(db), { now });
  const suggest = suggestionService(booking, geminiClient({ key: modelKey, model: modelName }));
  const script = readFileSync(join(__dirname, '../public/booking.js'));
  const css = readFileSync(join(__dirname, '../public/app.css'));
  const session = (token) => `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 28800 : 0}${secure ? '; Secure' : ''}`;

  return createServer(async (req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-security-policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const route = req.method + ' ' + path;
    try {
      const origin = publicBaseUrl ?? `http://${req.headers.host}`;
      if (!['GET', 'HEAD'].includes(req.method) && (req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && req.headers.origin !== origin))) {
        throw new HttpError(403, 'Submit this form from the Lab Booking site.');
      }

      if (route === 'GET /assets/booking.js') return send(res, 200, script, 'text/javascript');
      if (route === 'GET /assets/app.css') return send(res, 200, css, 'text/css');
      if (route === 'GET /') return redirect(res, '/labs');
      if (route === 'GET /login') return html(res, 200, view.login());
      if (route === 'POST /login') {
        const { email, password } = await readBody(req);
        const token = await auth.login(email, password);
        return token ? redirect(res, '/labs', { 'set-cookie': session(token) })
          : html(res, 401, view.login('The email address or password is incorrect.'));
      }
      const token = cookie(req, 'sid');
      if (route === 'POST /logout') {
        await auth.logout(token);
        return redirect(res, '/login', { 'set-cookie': session('') });
      }
      if (route === 'GET /labs' || route === 'GET /api/labs') {
        const user = await auth.current(token);
        if (!user) {
          return path.startsWith('/api/')
            ? json(res, 401, { error: 'Sign in to see labs.' })
            : redirect(res, '/login', {}, 302);
        }
        const list = await labs.listLabs();
        return path.startsWith('/api/') ? json(res, 200, list) : html(res, 200, view.labs(list, user));
      }
      const match = route.match(/^GET \/labs\/(\d+)$/);
      if (match || route === 'GET /bookings' || route === 'GET /staff') {
        const user = await auth.current(token);
        if (!user) return redirect(res, '/login', {}, 302);
        const date = localTime(now ? now() : new Date()).date;
        if (match) return html(res, 200, view.booking(await booking.lab(Number(match[1])), date, user));
        if (route === 'GET /bookings') return html(res, 200, view.personal(user));
        if (user.role !== 'staff') throw new HttpError(403, 'Staff access is required.');
        return html(res, 200, view.staff(await labs.listLabs(), date, user));
      }
      if (await handleBooking({ req, res, url, auth, token, booking, suggest })) return;
      throw new HttpError(404, 'This page could not be found.');
    } catch (error) {
      const status = error instanceof HttpError || error instanceof ServiceError ? error.status : 500;
      const text = status === 500 ? 'Lab Booking could not complete your request. Try again in a moment.' : error.message;
      if (status === 500) console.error('Request error:', error.code ?? error.name);
      if (path.startsWith('/api/')) return json(res, status, { error: text });
      return html(res, status, view.page('Request problem', `<h1>${view.escapeHtml(text)}</h1><a href="/">Return to Lab Booking</a>`));
    }
  });
}

module.exports = { createApp };
