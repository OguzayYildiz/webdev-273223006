const sofiaClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
});
const hours = Array.from({ length: 8 }, (_, index) => index + 9);
const maxId = 2147483647;

class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function localTime(now) {
  const parts = Object.fromEntries(sofiaClock.formatToParts(now).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function dateValue(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000')) {
    throw new ServiceError(422, 'Choose a valid date.');
  }
  const parsed = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ServiceError(422, 'Choose a valid date.');
  }
  return parsed;
}

function idValue(value) {
  if (!Number.isInteger(value) || value < 1 || value > maxId) {
    throw new ServiceError(422, 'Choose a valid record.');
  }
  return value;
}

function labelValue(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new ServiceError(422, name + ' must be between 1 and 80 characters.');
  }
  return value.trim();
}

function bookingService(data, { now = () => new Date() } = {}) {
  function unavailable(date, hour) {
    const current = localTime(now());
    return date < current.date || (date === current.date && hour <= current.hour);
  }

  async function lab(id) {
    const found = await data.lab(idValue(id));
    if (!found) throw new ServiceError(404, 'That lab could not be found.');
    return found;
  }

  function staff(user) {
    if (user.role !== 'staff') throw new ServiceError(403, 'Staff access is required.');
  }

  return {
    lab,
    async slots(user, labId, date) {
      const selectedLab = await lab(labId);
      const day = dateValue(date).getUTCDay();
      if (day === 0 || day === 6) return { lab: selectedLab, date, workstations: [] };
      const workstations = new Map();
      for (const row of await data.slots(labId, date)) {
        if (!workstations.has(row.id)) workstations.set(row.id, { label: row.label, booked: new Map() });
        if (row.hour !== null) workstations.get(row.id).booked.set(row.hour, row);
      }
      return {
        lab: selectedLab,
        date,
        workstations: Array.from(workstations, ([id, { label, booked }]) => ({
          id, label,
          slots: hours.map((hour) => {
            const entry = booked.get(hour);
            const mine = entry?.ownerId === user.id;
            return { hour, available: !entry && !unavailable(date, hour), booked: Boolean(entry), bookingId: mine ? entry.bookingId : null };
          })
        }))
      };
    },
    async book(user, { workstationId, date, hour }) {
      const day = dateValue(date).getUTCDay();
      if (day === 0 || day === 6 || !hours.includes(hour) || unavailable(date, hour)) {
        throw new ServiceError(422, 'Choose a future weekday slot between 09:00 and 17:00.');
      }
      try {
        return await data.create(user.id, idValue(workstationId), date, hour);
      } catch (error) {
        if (error.code === '23505') throw new ServiceError(409, 'That workstation is already booked for this hour.');
        if (error.code === '23503') throw new ServiceError(404, 'That workstation could not be found.');
        throw error;
      }
    },
    async cancel(user, bookingId) {
      const id = idValue(bookingId);
      const owner = await data.owner(id);
      if (owner === undefined) throw new ServiceError(404, 'That booking could not be found.');
      if (owner !== user.id) throw new ServiceError(403, 'Only the owner can cancel this booking.');
      if (!await data.cancel(id, user.id)) throw new ServiceError(404, 'That booking could not be found.');
    },
    async mine(user) {
      const current = localTime(now());
      return (await data.owned(user.id, current.date)).filter((booking) =>
        booking.date > current.date || booking.hour >= current.hour);
    },
    async forDay(user, date) {
      staff(user);
      dateValue(date);
      return data.forDay(date);
    },
    async addLab(user, { name, location }) {
      staff(user);
      try {
        return await data.addLab(labelValue(name, 'Lab name'), labelValue(location, 'Location'));
      } catch (error) {
        if (error.code === '23505') throw new ServiceError(409, 'A lab with that name already exists.');
        throw error;
      }
    },
    async addWorkstation(user, labId, { label }) {
      staff(user);
      await lab(labId);
      try {
        return await data.addWorkstation(labId, labelValue(label, 'Workstation label'));
      } catch (error) {
        if (error.code === '23505') throw new ServiceError(409, 'That workstation already exists in this lab.');
        throw error;
      }
    }
  };
}

module.exports = { bookingService, localTime, ServiceError };
