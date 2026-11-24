const { openDatabase, migrate } = require('./data/database');
const { createApp } = require('./app');

async function main() {
  const secure = process.env.NODE_ENV === 'production';
  if (secure && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production.');
  const db = await openDatabase({ url: process.env.DATABASE_URL, location: './.local/postgres' });
  try {
    await migrate(db);
    const server = createApp(db, { publicBaseUrl: process.env.PUBLIC_BASE_URL, secure });
    const port = Number(process.env.PORT ?? 3000);
    server.listen(port, '0.0.0.0', () => console.log('Lab Booking listening on port ' + port));
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.once(signal, () => server.close(() => void db.close()));
    }
  } catch (error) {
    await db.close();
    throw error;
  }
}

main().catch((error) => {
  console.error('Startup failed:', error.code ?? error.message);
  process.exitCode = 1;
});
