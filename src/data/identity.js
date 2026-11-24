function identity(db) {
  return {
    async byEmail(email) {
      const { rows } = await db.query(
        'SELECT id, email, role, password_hash, google_subject FROM users WHERE email = $1', [email]
      );
      return rows[0];
    },
    async byGoogle({ subject, email }) {
      const existing = await db.query('SELECT id FROM users WHERE google_subject = $1', [subject]);
      if (existing.rows[0]) return existing.rows[0];
      const { rows } = await db.query(`
        INSERT INTO users (email, google_subject) VALUES ($1, $2)
        ON CONFLICT (email) DO UPDATE SET google_subject = EXCLUDED.google_subject
        WHERE users.google_subject IS NULL OR users.google_subject = EXCLUDED.google_subject
        RETURNING id`, [email, subject]);
      return rows[0];
    },
    async userForSession(hash) {
      const { rows } = await db.query(
        `SELECT u.id, u.email, u.role FROM sessions s
         JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [hash]
      );
      return rows[0];
    },
    async saveSession(hash, userId) {
      await db.query("INSERT INTO sessions VALUES ($1, $2, now() + interval '8 hours')", [hash, userId]);
    },
    async deleteSession(hash) {
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [hash]);
    }
  };
}

module.exports = { identity };
