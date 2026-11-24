const { openDatabase, migrate } = require('./data/database');
const { hashPassword } = require('./services/auth');

async function createUser() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = process.argv[3] ?? 'student';
  const password = process.env.NEW_USER_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254 ||
    !['student', 'staff'].includes(role) || !password || password.length < 12 || password.length > 256) {
    throw new Error('Usage: set NEW_USER_PASSWORD securely, then npm run create-user -- email [student|staff]. Use 12–256 characters.');
  }
  const db = await openDatabase({ url: process.env.DATABASE_URL, location: './.local/postgres' });
  try {
    await migrate(db);
    await db.query('INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [email, await hashPassword(password), role]);
    console.log('Created the requested account.');
  } finally {
    await db.close();
  }
}

createUser().catch((error) => {
  console.error('User creation failed:', error.code ?? error.message);
  process.exitCode = 1;
});
