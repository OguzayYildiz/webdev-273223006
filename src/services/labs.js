function labService(data) {
  return { listLabs: () => data.list() };
}
module.exports = { labService };
