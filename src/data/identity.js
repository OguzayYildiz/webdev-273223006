function identity(db) {
  return {
    async byEmail(email) {
      const { rows } = await db.query(
        'SELECT id, email, role, password_hash, google_subject FROM users WHERE email = $1', [email]
      );
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
