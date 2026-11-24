const { ServiceError } = require('../src/services/booking');
const { openProject } = require('../src/project');

const integer = { type: 'integer', minimum: 1, maximum: 2147483647 };
const day = { type: 'string', description: 'A date in YYYY-MM-DD format in Europe/Sofia.' };
const tool = (name, description, properties) => ({
  name, description, inputSchema: { type: 'object', properties, required: Object.keys(properties) }
});

const tools = [
  tool('list_free_slots', 'List available workstation hours in a lab on a date in the Sofia time zone.', {
    labId: integer, date: day
  }),
  tool('my_bookings', 'List upcoming workstation reservations owned by the current session user.', {}),
  tool('book_slot', 'Reserve an available workstation hour for the current user after they confirm the selection.', {
    workstationId: integer, date: day, hour: { type: 'integer', minimum: 9, maximum: 16 }
  })
];

function result(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

function createProjectTools(load = openProject, { token = process.env.MCP_TOKEN } = {}) {
  let project;
  const loadOnce = async () => {
    project ??= load();
    try {
      return await project;
    } catch (error) {
      project = undefined;
      throw error;
    }
  };
  return {
    async call(name, args) {
      if (!token) return result('A valid session token is required for project tools.', true);
      try {
        const { auth, booking } = await loadOnce();
        const user = await auth.current(token);
        if (!user) return result('A valid session token is required for project tools.', true);
        if (name === 'my_bookings') return result(JSON.stringify(await booking.mine(user)));
        if (name === 'book_slot') return result(JSON.stringify(await booking.book(user, args)));
        const availability = await booking.slots(user, args.labId, args.date);
        const available = availability.workstations.flatMap(({ id, label, slots }) =>
          slots.filter(({ available }) => available).map(({ hour }) => ({ workstationId: id, workstation: label, hour })));
        return result(JSON.stringify({ lab: availability.lab, date: availability.date, slots: available }));
      } catch (error) {
        return result(error instanceof ServiceError ? error.message : 'The project data is unavailable.', true);
      }
    },
    async close() {
      if (project) await (await project).close();
    }
  };
}

module.exports = { tools, createProjectTools };
