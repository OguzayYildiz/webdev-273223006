const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function page(title, content, user, screen = '', endpoint = '') {
  const navigation = user ? `<nav aria-label="Account"><a href="/labs">Labs</a><a href="/bookings">My bookings</a>
${user.role === 'staff' ? '<a href="/staff">Staff</a>' : ''}
<form method="post" action="/logout"><button class="quiet">Sign out</button></form></nav>` : '';
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Campus Workstations</title><link rel="stylesheet" href="/assets/app.css"></head>
<body><a class="skip" href="#main">Skip to content</a>
<header><div class="wrap top"><a class="brand" href="/">TU Sofia <span>Campus Workstations</span></a>${navigation}</div></header>
<main id="main" class="wrap" data-screen="${screen}" data-endpoint="${endpoint}">${content}</main>
<footer class="wrap">Technical University of Sofia · Web Development</footer>
${screen ? '<script src="/assets/booking.js" defer></script>' : ''}</body></html>`;
}

function login(error = '') {
  return page('Sign in', `<section class="narrow"><h1>Sign in</h1>
<p class="lede">Use your account to view labs and book a workstation.</p>
<form class="panel stack" method="post" action="/login">
${error ? `<p role="alert" class="error">${escapeHtml(error)}</p>` : ''}
<label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" maxlength="254" required>
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required>
<button>Sign in</button></form></section>`);
}

function labs(labList, user) {
  const rows = labList.map((lab) => `<li class="room"><h2><a href="/labs/${lab.id}">${escapeHtml(lab.name)}</a></h2>
<p>${escapeHtml(lab.location)}</p></li>`).join('');
  return page('Labs', `<h1>Computer labs</h1><p class="lede">Find a lab by room and location.</p>
${rows ? `<ul class="rooms">${rows}</ul>` : '<p class="panel">No labs are listed yet. Check back later.</p>'}`, user);
}

const statusRegion = '<p id="status" role="status" tabindex="-1">Loading…</p><button id="retry" type="button" hidden>Retry</button><div id="results"></div>';

function booking(lab, date, user) {
  return page(lab.name, `<p><a href="/labs">All labs</a></p><h1>${escapeHtml(lab.name)}</h1>
<p class="lede">${escapeHtml(lab.location)} · Europe/Sofia</p>
<div class="date-field"><label for="day">Booking date</label><input id="day" type="date" min="${date}" value="${date}" required></div>
<form id="suggest" class="panel stack" data-endpoint="/api/labs/${lab.id}/suggestion">
<label for="preference">Ask for a slot suggestion</label>
<input id="preference" name="preference" maxlength="200" placeholder="For example, before noon" aria-describedby="model-data" required>
<p id="model-data">Your preference and candidate slots are sent to Gemini. Include scheduling details only.</p>
<button>Suggest a slot</button><p id="suggestion" role="status"></p></form>
${statusRegion}`, user, 'lab', '/api/labs/' + lab.id + '/slots');
}

function personal(user) {
  return page('My bookings', '<h1>My bookings</h1><p class="lede">Review or cancel your upcoming workstation reservations.</p>' + statusRegion, user, 'mine');
}

function staff(labList, date, user) {
  const options = labList.map((lab) => `<option value="${lab.id}">${escapeHtml(lab.name)}</option>`).join('');
  return page('Staff', `<h1>Lab management</h1>
<div class="management">
<form id="new-lab" class="panel stack"><h2>Add a lab</h2>
<label for="lab-name">Lab name</label><input id="lab-name" name="name" maxlength="80" required>
<label for="location">Location</label><input id="location" name="location" maxlength="80" required><button>Add lab</button></form>
<form id="new-workstation" class="panel stack"><h2>Add a workstation</h2>
<label for="lab-id">Lab</label><select id="lab-id" name="lab" required><option value="">Choose a lab</option>${options}</select>
<label for="workstation-label">Workstation label</label><input id="workstation-label" name="label" maxlength="80" required><button>Add workstation</button></form>
</div><h2>Bookings by date</h2>
<div class="date-field"><label for="day">Booking date</label><input id="day" type="date" value="${date}" required></div>
${statusRegion}`, user, 'staff');
}

module.exports = { page, login, labs, booking, personal, staff, escapeHtml };
