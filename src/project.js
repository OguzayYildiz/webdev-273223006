const { openDatabase } = require('./data/database');
const { identity } = require('./data/identity');
const { bookingData } = require('./data/bookings');
const { authService } = require('./services/auth');
const { bookingService } = require('./services/booking');

async function openProject() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Project MCP tools require DATABASE_URL for the shared PostgreSQL database.');
  const db = await openDatabase({ url });
  return {
    auth: authService(identity(db)),
    booking: bookingService(bookingData(db)),
    close: () => db.close()
  };
}

module.exports = { openProject };
