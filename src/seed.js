const { openDatabase, migrate } = require('./data/database');
const { hashPassword } = require('./services/auth');

async function seed() {
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
    throw new Error('Demo records are restricted to the local embedded development database.');
  }
  const db = await openDatabase({ location: './.local/postgres' });
  try {
    await migrate(db);
    const passwordHash = await hashPassword('lab-demo-student');
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
        ['student@example.test', passwordHash]);
      await tx.query("INSERT INTO labs (name, location) VALUES ('Lab A-204', 'Building A · Level 2'), ('Lab B-108', 'Building B · Level 1') ON CONFLICT (name) DO NOTHING");
    });
  } finally {
    await db.close();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
