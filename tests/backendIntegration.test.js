// HTTP integration: real Express routes, bcrypt, JWT and authorization middleware.
// Only Mongoose persistence methods are replaced; no database connection is opened.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createApp } = require('../server');
const secret = require('node:crypto').randomBytes(32).toString('hex');
const adminId = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';
const productId = '507f1f77bcf86cd799439013';
const valid = { title: '101', type1: 'Wedding', type2: 'Fold', cPrice: '10', sPrice: '8', stock: 100, image: ['https://example.com/card.jpg'] };
let url, server, User, Post, users, products, writes, reads, failRead, failWrite;
let originals;
const envBefore = {};

before(async () => {
  for (const key of ['SECRET_OR_KEY', 'ADMIN_EMAILS', 'ALLOW_REGISTRATION']) envBefore[key] = process.env[key];
  process.env.SECRET_OR_KEY = secret;
  const app = createApp({ database: { connection: { readyState: 1 } } });
  User = mongoose.model('User'); Post = mongoose.model('Post');
  originals = { findOne: User.findOne, findById: User.findById, find: Post.find, save: Post.prototype.save, remove: Post.findByIdAndDelete };
  User.findOne = async ({ email }) => { reads++; if (failRead) throw Error('private database failure'); return users.find(user => user.email === email) || null; };
  User.findById = async id => { reads++; if (failRead) throw Error('private database failure'); return users.find(user => user._id === String(id)) || null; };
  Post.find = () => ({ sort: async () => { if (failRead) throw Error('private database failure'); return products; } });
  Post.prototype.save = async function () {
    if (failWrite) throw Error('private database failure');
    const error = this.validateSync(); if (error) throw error;
    const record = this.toObject(); products.push(record); writes++; return this;
  };
  Post.findByIdAndDelete = async id => {
    if (failWrite) throw Error('private database failure');
    const index = products.findIndex(product => String(product._id) === id);
    if (index === -1) return null;
    writes++; return products.splice(index, 1)[0];
  };
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  url = 'http://127.0.0.1:' + server.address().port;
});

beforeEach(async () => {
  process.env.SECRET_OR_KEY = secret;
  process.env.ADMIN_EMAILS = 'admin@example.com';
  delete process.env.ALLOW_REGISTRATION;
  const password = await bcrypt.hash('test-password', 4);
  users = [
    { _id: adminId, name: 'Shop Admin', email: 'admin@example.com', password },
    { _id: memberId, name: 'Member', email: 'member@example.com', password }
  ];
  products = [{ _id: productId, ...valid }];
  writes = 0; reads = 0; failRead = false; failWrite = false;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (originals) {
    User.findOne = originals.findOne; User.findById = originals.findById;
    Post.find = originals.find; Post.prototype.save = originals.save; Post.findByIdAndDelete = originals.remove;
  }
  for (const [key, value] of Object.entries(envBefore)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = token;
  const response = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
const tokenFor = (id, options = {}, signingSecret = secret) => 'Bearer ' + jwt.sign({ id }, signingSecret, { algorithm: 'HS256', expiresIn: '1h', ...options });

async function login(email = 'admin@example.com', password = 'test-password') {
  return request('/login', { method: 'POST', body: { email, userPass: password } });
}

test('login → signed JWT → protected profile preserves identity and excludes password', async () => {
  const result = await login();
  assert.equal(result.status, 200);
  const claims = jwt.verify(result.body.token.slice(7), secret, { algorithms: ['HS256'] });
  assert.equal(claims.id, adminId);
  assert.equal(claims.exp - claims.iat, 8 * 60 * 60);
  const profile = await request('/user/' + adminId, { token: result.body.token });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.email, 'admin@example.com');
  assert.equal(profile.body.password, undefined);
});

test('wrong password and missing account return the same generic login error', async () => {
  const wrong = await login('admin@example.com', 'incorrect');
  const absent = await login('absent@example.com');
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong, absent);
  assert.equal(writes, 0);
});

test('query injection and overlong UTF-8 passwords are rejected before persistence access', async () => {
  const injection = await request('/login', { method: 'POST', body: { email: { $ne: null }, userPass: 'test-password' } });
  const oversized = await login('admin@example.com', 'अ'.repeat(25));
  assert.equal(injection.status, 400); assert.equal(oversized.status, 400); assert.equal(reads, 0);
});

test('expired, forged and unsupported-algorithm tokens cannot authorize mutations', async () => {
  for (const token of [tokenFor(adminId, { expiresIn: -1 }), tokenFor(adminId, {}, require('node:crypto').randomBytes(32).toString('hex')), tokenFor(adminId, { algorithm: 'HS384' }), 'Bearer broken']) {
    assert.equal((await request('/createPost', { method: 'POST', body: valid, token })).status, 401);
  }
  assert.equal(reads, 0); assert.equal(writes, 0);
});

test('deleted accounts and non-admin members cannot create or delete products', async () => {
  assert.equal((await request('/createPost', { method: 'POST', body: valid, token: tokenFor('507f1f77bcf86cd799439099') })).status, 401);
  const member = (await login('member@example.com')).body.token;
  assert.equal((await request('/createPost', { method: 'POST', body: valid, token: member })).status, 403);
  assert.equal((await request('/deletePost/' + productId, { method: 'DELETE', token: member })).status, 403);
  assert.equal(writes, 0); assert.equal(products.length, 1);
});

test('missing administrator allowlist fails closed even with a valid admin token', async () => {
  delete process.env.ADMIN_EMAILS;
  assert.equal((await request('/createPost', { method: 'POST', body: valid, token: tokenFor(adminId) })).status, 403);
  assert.equal(writes, 0);
});

test('admin login → create → catalogue → delete operates only on isolated fixtures', async () => {
  const token = (await login()).body.token;
  const created = await request('/createPost', { method: 'POST', token, body: { ...valid, title: 'Hindi invitation', postedBy: memberId, unexpected: 'discard' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.post.title, 'Hindi invitation');
  assert.equal(created.body.post.postedBy, undefined);
  assert.equal(created.body.post.unexpected, undefined);
  const listing = await request('/allPost');
  assert.equal(listing.status, 200); assert.equal(listing.body.length, 2);
  const removed = await request('/deletePost/' + created.body.post._id, { method: 'DELETE', token });
  assert.equal(removed.status, 200); assert.equal(removed.body.success, true);
  assert.equal(products.length, 1); assert.equal(products[0]._id, productId); assert.equal(writes, 2);
});

test('invalid product data, malformed IDs and bulk deletion cannot alter fixtures', async () => {
  const token = tokenFor(adminId);
  assert.equal((await request('/createPost', { method: 'POST', token, body: { ...valid, image: ['javascript:alert(1)'] } })).status, 400);
  assert.equal((await request('/deletePost/not-an-id', { method: 'DELETE', token })).status, 400);
  assert.equal((await request('/allPost', { method: 'DELETE', token })).status, 405);
  assert.equal((await request('/deletePost/507f1f77bcf86cd799439099', { method: 'DELETE', token })).status, 404);
  assert.equal(writes, 0); assert.equal(products.length, 1);
});

test('members cannot read another account profile', async () => {
  const result = await request('/user/' + adminId, { token: tokenFor(memberId) });
  assert.equal(result.status, 403); assert.equal(result.body.email, undefined);
});

test('persistence failures return bounded JSON errors without leaking details', async () => {
  failRead = true;
  const auth = await login();
  const catalogue = await request('/allPost');
  assert.equal(auth.status, 503); assert.equal(catalogue.status, 500);
  assert.ok(!JSON.stringify([auth, catalogue]).includes('private database failure'));
  failRead = false; failWrite = true;
  const created = await request('/createPost', { method: 'POST', token: tokenFor(adminId), body: valid });
  assert.equal(created.status, 500); assert.equal(writes, 0);
});
