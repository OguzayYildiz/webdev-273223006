const { openDatabase, migrate } = require('./data/database');

async function run() {
  const db = await openDatabase({ url: process.env.DATABASE_URL, location: './.local/postgres' });
  try {
    await migrate(db);
    console.log('Database migrations are current.');
  } finally {
    await db.close();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error.code ?? error.message);
  process.exitCode = 1;
});
