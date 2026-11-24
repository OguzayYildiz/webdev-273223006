const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function page(title, content, user) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Lab Booking</title><link rel="stylesheet" href="/assets/app.css"></head>
<body><a class="skip" href="#main">Skip to content</a>
<header><div class="wrap top"><a class="brand" href="/">TU Sofia <span>Lab Booking</span></a>
${user ? '<form method="post" action="/logout"><button class="quiet">Sign out</button></form>' : ''}</div></header>
<main id="main" class="wrap">${content}</main>
<footer class="wrap">Technical University of Sofia · Web Development</footer></body></html>`;
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
  const rows = labList.map((lab) => `<li class="room"><h2>${escapeHtml(lab.name)}</h2>
<p>${escapeHtml(lab.location)}</p></li>`).join('');
  return page('Labs', `<h1>Computer labs</h1><p class="lede">Find a lab by room and location.</p>
${rows ? `<ul class="rooms">${rows}</ul>` : '<p class="panel">No labs are listed yet. Check back later.</p>'}`, user);
}

module.exports = { page, login, labs, escapeHtml };
