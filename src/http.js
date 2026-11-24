class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, data, type = 'text/plain', headers = {}) {
  res.writeHead(status, { 'content-type': type + '; charset=utf-8', ...headers });
  res.end(data);
}
const html = (res, status, data) => send(res, status, data, 'text/html');
const json = (res, status, data) => send(res, status, JSON.stringify(data), 'application/json');
const redirect = (res, location, headers = {}, status = 303) => send(res, status, '', 'text/plain', { location, ...headers });

function cookie(req, name) {
  return req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))?.slice(name.length + 1);
}

async function readBody(req) {
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 8192) throw new HttpError(413, 'The submitted data is too large.');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type']?.split(';')[0];
  if (type === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(text));
  if (type === 'application/json') {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new HttpError(400, 'The request is not valid JSON.');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Send a JSON object.');
    return value;
  }
  throw new HttpError(415, 'Use a form or JSON to submit this request.');
}

module.exports = { HttpError, html, json, send, redirect, cookie, readBody };
