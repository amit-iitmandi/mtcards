const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, startServer } = require('../server');

async function serve(t, app) {
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('health reflects DB disconnects and API requests fail promptly', async t => {
  const database = { connection: { readyState: 1 } };
  const url = await serve(t, createApp({ database, mountRoutes: false }));
  let result = await fetch(url + '/healthz');
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  database.connection.readyState = 0;
  result = await fetch(url + '/healthz');
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { status: 'unavailable' });
  assert.equal((await fetch(url + '/allPost')).status, 503);
});

test('startup refuses missing configuration without contacting DB', async () => {
  let connects = 0;
  const database = { connect() { connects++; } };
  await assert.rejects(startServer({ database, env: {} }), /DATABASE_ACCESS/);
  await assert.rejects(startServer({ database, env: { DATABASE_ACCESS: 'test' } }), /SECRET_OR_KEY/);
  assert.equal(connects, 0);
});

test('startup connects exactly once before opening the HTTP listener', async t => {
  const calls = [];
  const database = {
    set: (key, value) => calls.push(['set', key, value]),
    connect: async (uri, options) => { calls.push(['connect', uri, options]); }
  };
  const env = { DATABASE_ACCESS: 'test-only', SECRET_OR_KEY: 'test-only', PORT: '0' };
  const server = await startServer({ database, env, appFactory() {
    assert.equal(calls.filter(call => call[0] === 'connect').length, 1);
    return createApp({ database: { connection: { readyState: 1 } }, mountRoutes: false });
  } });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '0.0.0.0');
  assert.equal(calls[1][2].autoIndex, false);
});

test('failed MongoDB connection never opens a listener', async () => {
  await assert.rejects(startServer({
    database: { set() {}, connect: async () => { throw Error('offline'); } },
    env: { DATABASE_ACCESS: 'test-only', SECRET_OR_KEY: 'test-only' },
    appFactory: () => { throw Error('must not create app'); }
  }), /offline/);
});

test('CORS allows only configured browser origins and errors return JSON', async t => {
  const url = await serve(t, createApp({ database: { connection: { readyState: 1 } }, env: { CORS_ORIGINS: 'https://mtcards.in' }, mountRoutes: false }));
  let result = await fetch(url + '/healthz', { headers: { Origin: 'https://mtcards.in' } });
  assert.equal(result.headers.get('access-control-allow-origin'), 'https://mtcards.in');
  result = await fetch(url + '/healthz', { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(result.headers.get('access-control-allow-origin'), null);
  result = await fetch(url + '/not-an-api');
  assert.equal(result.status, 404);
  assert.deepEqual(await result.json(), { error: 'Not found' });
  result = await fetch(url + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(result.status, 400);
  assert.deepEqual(await result.json(), { error: 'Invalid request' });
});

test('mounted API serves catalogue JSON and denies anonymous writes without database writes', async t => {
  const app = createApp({ database: { connection: { readyState: 1 } }, env: {} });
  const mongoose = require('mongoose');
  const Post = mongoose.model('Post');
  const originalFind = Post.find;
  const records = [{ title: 'Existing test card', image: ['https://example.com/card.jpg'] }];
  Post.find = filter => {
    assert.deepEqual(filter, { $or: [{ status: 'published' }, { status: { $exists: false } }] });
    return { sort() { return this; }, limit(value) { assert.equal(value, 500); return this; }, lean: async () => records };
  };
  t.after(() => { Post.find = originalFind; });
  const url = await serve(t, app);
  const result = await fetch(url + '/allPost');
  assert.equal(result.status, 200);
  const publicRecords = await result.json();
  assert.equal(publicRecords[0].title, records[0].title);
  assert.equal(publicRecords[0].sPrice, undefined);
  assert.equal(publicRecords[0].stock, undefined);
  assert.equal((await fetch(url + '/register')).status, 410);
  assert.equal((await fetch(url + '/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(url + '/createPost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(url + '/deletePost/507f1f77bcf86cd799439011', { method: 'DELETE' })).status, 401);
  assert.equal((await fetch(url + '/allPost', { method: 'DELETE' })).status, 405);
});
