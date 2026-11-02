const test = require('node:test');
const assert = require('node:assert/strict');
const authLimit = require('../middleware/authLimit');
test('auth limit blocks retries despite spoofed proxy headers and recovers after window', () => {
  let time = 0, next = 0, status, retry;
  const limit = authLimit({ limit: 2, windowMs: 1000, now: () => time });
  const req = { method: 'POST', socket: { remoteAddress: '127.0.0.1' }, headers: {} };
  const res = { status(code) { status = code; return this; }, json() {}, set(key, value) { retry = value; } };
  limit(req, res, () => next++); limit(req, res, () => next++);
  req.headers['x-forwarded-for'] = 'another-client';
  limit(req, res, () => next++);
  assert.equal(next, 2); assert.equal(status, 429); assert.equal(retry, '1');
  time = 1001; limit(req, res, () => next++); assert.equal(next, 3);
});
