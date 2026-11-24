function labData(db) {
  return {
    async list() {
      return (await db.query('SELECT id, name, location FROM labs ORDER BY name')).rows;
    }
  };
}

module.exports = { labData };
