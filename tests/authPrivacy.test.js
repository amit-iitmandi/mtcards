const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadAuth({ secret, signError = false } = {}) {
  const handlers = {};
  const logs = [];
  let databaseReads = 0;
  const user = { _id: 'id', name: 'name', password: 'hash' };
  const router = { get: (path, fn) => { handlers['GET ' + path] = fn; }, post: (path, fn) => { handlers['POST ' + path] = fn; } };
  const dependencies = {
    express: { Router: () => router },
    bcryptjs: { compare: async () => true },
    jsonwebtoken: { sign: (payload, key, options, callback) => callback(signError ? new Error('failed') : null, 'secret-token') },
    mongoose: { model: () => ({ find: () => { throw new Error('Directory must not query MongoDB'); }, findOne: async () => { databaseReads++; return user; } }) }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/auth'), 'utf8'), {
    require: name => dependencies[name], module: { exports: {} },
    process: { env: { SECRET_OR_KEY: secret } }, console: { log: value => logs.push(value) }
  });
  return { handlers, logs, reads: () => databaseReads };
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const settle = () => new Promise(resolve => setImmediate(resolve));
test('public directory is closed without reading user records', () => {
  const auth = loadAuth(); const res = response();
  auth.handlers['GET /register']({}, res);
  assert.equal(res.statusCode, 410); assert.equal(auth.reads(), 0);
});
test('login fails closed before database access when signing key is missing', () => {
  const auth = loadAuth(); const res = response();
  auth.handlers['POST /login']({ body: {} }, res);
  assert.equal(res.statusCode, 503); assert.equal(auth.reads(), 0);
});
test('successful login never logs its bearer token', async () => {
  const auth = loadAuth({ secret: 'test-only' }); const res = response();
  auth.handlers['POST /login']({ body: { email: 'test@example.com', userPass: 'password' } }, res);
  await settle();
  assert.equal(res.body.token, 'Bearer secret-token');
  assert.ok(!auth.logs.includes('secret-token'));
});
test('signing failure does not return an unusable bearer token', async () => {
  const auth = loadAuth({ secret: 'test-only', signError: true }); const res = response();
  auth.handlers['POST /login']({ body: { email: 'test@example.com', userPass: 'password' } }, res);
  await settle(); assert.equal(res.statusCode, 503); assert.equal(res.body.token, undefined);
});
