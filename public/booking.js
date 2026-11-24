const main = document.querySelector('main[data-screen]');
if (main) {
  const status = document.querySelector('#status');
  const results = document.querySelector('#results');
  const day = document.querySelector('#day');
  const screen = main.dataset.screen;
  let loadNumber = 0;

  function element(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function report(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  async function request(path, method = 'GET', value) {
    const response = await fetch(path, {
      method,
      headers: value ? { 'content-type': 'application/json' } : {},
      body: value ? JSON.stringify(value) : undefined
    });
    if (response.status === 401) {
      location.assign('/login');
      throw new Error('Your session expired. Sign in again.');
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'The request could not be completed.');
    }
    return response.status === 204 ? undefined : response.json();
  }

  const time = (hour) => String(hour).padStart(2, '0') + ':00';

  function action(text, method, url, value, success) {
    const button = element('button', text);
    button.type = 'button';
    button.addEventListener('click', async () => {
      button.disabled = true;
      report('Saving…');
      try {
        await request(url, method, value);
        status.focus();
        await load(success);
      } catch (error) {
        report(error.message === 'Failed to fetch' ? 'Check your connection and try again.' : error.message, true);
        button.disabled = false;
      }
    });
    return button;
  }

  function drawSlots(data) {
    for (const workstation of data.workstations) {
      const section = element('section', '');
      section.className = 'panel workstation';
      section.append(element('h2', workstation.label));
      const list = element('ul', '');
      list.className = 'slots';
      for (const slot of workstation.slots) {
        const label = time(slot.hour);
        const row = element('li', '');
        row.append(element('strong', label));
        if (slot.available) {
          const button = action('Book', 'POST', '/api/bookings',
            { workstationId: workstation.id, date: data.date, hour: slot.hour }, 'Workstation booked.');
          button.setAttribute('aria-label', 'Book ' + workstation.label + ' at ' + label);
          row.append(button);
        } else if (slot.bookingId) {
          const button = action('Cancel', 'DELETE', '/api/bookings/' + slot.bookingId, undefined, 'Booking cancelled.');
          button.setAttribute('aria-label', 'Cancel ' + workstation.label + ' at ' + label);
          row.append(button);
        } else {
          row.append(element('span', slot.booked ? 'Booked' : 'Unavailable'));
        }
        list.append(row);
      }
      section.append(list);
      results.append(section);
    }
    return data.workstations.length ? '' : 'No workstations for this date. Choose a weekday or another lab.';
  }

  function drawBookings(rows) {
    const list = element('ul', '');
    list.className = 'rooms';
    for (const row of rows) {
      const item = element('li', '');
      item.className = 'room';
      item.append(element('h2', row.lab + ' · ' + row.workstation), element('p', row.date + ' at ' + time(row.hour)));
      if (screen === 'mine') {
        const cancel = action('Cancel booking', 'DELETE', '/api/bookings/' + row.id, undefined, 'Booking cancelled.');
        cancel.setAttribute('aria-label', 'Cancel booking for ' + row.workstation + ' on ' + row.date + ' at ' + time(row.hour));
        item.append(cancel);
      } else {
        item.append(element('p', 'Student account ' + row.userId));
      }
      list.append(item);
    }
    results.append(list);
    return rows.length ? '' : 'There are no bookings to show.';
  }

  async function load(success = '') {
    const requestNumber = ++loadNumber;
    const selectedDate = day?.value;
    const retry = document.querySelector('#retry');
    retry.hidden = true;
    results.replaceChildren();
    report('Loading…');
    results.setAttribute('aria-busy', 'true');
    try {
      const query = '?date=' + encodeURIComponent(selectedDate);
      const url = screen === 'lab' ? main.dataset.endpoint + query
        : screen === 'staff' ? '/api/staff/bookings' + query
          : '/api/bookings/mine';
      const result = await request(url);
      if (requestNumber !== loadNumber) return;
      const empty = screen === 'lab' ? drawSlots(result) : drawBookings(result);
      report([success, empty || (screen === 'lab' ? 'Workstations loaded.' : 'Bookings loaded.')].filter(Boolean).join(' '));
    } catch (error) {
      if (requestNumber !== loadNumber) return;
      report(error.message === 'Failed to fetch' ? 'Could not load this screen. Check your connection and retry.' : error.message, true);
      retry.hidden = false;
    } finally {
      if (requestNumber === loadNumber) results.setAttribute('aria-busy', 'false');
    }
  }

  document.querySelector('#retry').addEventListener('click', () => load());
  day?.addEventListener('change', () => load());

  document.querySelector('#new-lab')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    submit.disabled = true;
    report('Saving lab…');
    try {
      const lab = await request('/api/staff/labs', 'POST', Object.fromEntries(new FormData(form)));
      document.querySelector('#lab-id').append(new Option(lab.name, lab.id, false, true));
      form.reset();
      report('Lab added.');
    } catch (error) {
      report(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector('#new-workstation')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    submit.disabled = true;
    report('Saving workstation…');
    try {
      await request('/api/staff/labs/' + form.elements.lab.value + '/workstations', 'POST', { label: form.elements.label.value });
      form.elements.label.value = '';
      report('Workstation added.');
    } catch (error) {
      report(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  load();
}
