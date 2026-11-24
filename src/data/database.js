const { PGlite } = require('@electric-sql/pglite');
const { Pool } = require('pg');
const { mkdir, readdir, readFile } = require('node:fs/promises');
const { dirname, join } = require('node:path');

async function openDatabase({ url, location } = {}) {
  if (url) {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 4000 });
    pool.on('error', (error) => console.error('Idle database connection closed:', error.code ?? error.name));
    return {
      query: (...args) => pool.query(...args),
      close: () => pool.end(),
      async transaction(task) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const value = await task(client);
          await client.query('COMMIT');
          return value;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    };
  }
  if (location) await mkdir(dirname(location), { recursive: true });
  const db = new PGlite(location);
  await db.waitReady;
  return db;
}

async function migrate(db) {
  const directory = join(__dirname, '../../migrations');
  const files = (await readdir(directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  await db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(273223006)');
    await tx.query('CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY)');
    const applied = new Set((await tx.query('SELECT name FROM migrations')).rows.map(({ name }) => name));
    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = await readFile(join(directory, name), 'utf8');
      await (tx.exec ? tx.exec(sql) : tx.query(sql));
      await tx.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
    }
  });
}

module.exports = { openDatabase, migrate };
