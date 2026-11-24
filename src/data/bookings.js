const bookingDetails = `
  SELECT b.id, b.user_id AS "userId", b.booked_on::text AS date, b.hour,
         w.id AS "workstationId", w.label AS workstation, l.name AS lab
  FROM bookings b JOIN workstations w ON w.id = b.workstation_id
  JOIN labs l ON l.id = w.lab_id`;

function bookingData(db) {
  return {
    async lab(id) {
      return (await db.query('SELECT id, name, location FROM labs WHERE id = $1', [id])).rows[0];
    },
    async slots(labId, date) {
      return (await db.query(`
        SELECT w.id, w.label, b.hour, b.user_id AS "ownerId", b.id AS "bookingId"
        FROM workstations w LEFT JOIN bookings b ON b.workstation_id = w.id AND b.booked_on = $2
        WHERE w.lab_id = $1 ORDER BY w.label, b.hour`, [labId, date])).rows;
    },
    async create(userId, workstationId, date, hour) {
      return (await db.query(`
        INSERT INTO bookings (user_id, workstation_id, booked_on, hour) VALUES ($1, $2, $3, $4)
        RETURNING id, user_id AS "userId", workstation_id AS "workstationId", booked_on::text AS date, hour`,
      [userId, workstationId, date, hour])).rows[0];
    },
    async owner(id) {
      return (await db.query('SELECT user_id FROM bookings WHERE id = $1', [id])).rows[0]?.user_id;
    },
    async cancel(id, userId) {
      return (await db.query('DELETE FROM bookings WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).rows[0];
    },
    async owned(userId, date) {
      return (await db.query(bookingDetails + ' WHERE b.user_id = $1 AND b.booked_on >= $2 ORDER BY b.booked_on, b.hour, b.id',
        [userId, date])).rows;
    },
    async forDay(date) {
      return (await db.query(bookingDetails + `
        WHERE b.booked_on = $1 ORDER BY b.hour, b.id`,
      [date])).rows;
    },
    async addLab(name, location) {
      return (await db.query('INSERT INTO labs (name, location) VALUES ($1, $2) RETURNING id, name, location',
        [name, location])).rows[0];
    },
    async addWorkstation(labId, label) {
      return (await db.query('INSERT INTO workstations (lab_id, label) VALUES ($1, $2) RETURNING id, lab_id AS "labId", label',
        [labId, label])).rows[0];
    }
  };
}
module.exports = { bookingData };
