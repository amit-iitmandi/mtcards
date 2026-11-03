const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createApp } = require('../server');
const token = 'A'.repeat(32);
const email = 'admin@example.com';
const id = '507f1f77bcf86cd799439011';
let server, url, record, updates, originals;
const previous = { secret: process.env.SECRET_OR_KEY, admins: process.env.ADMIN_EMAILS };
before(async () => {
 const app = createApp({database:{connection:{readyState:1}}});
 const User = mongoose.model('User');
 originals={update:User.findOneAndUpdate,find:User.findById};
 User.findById=async () => record;
 User.findOneAndUpdate=async (query,update) => {
   updates++;
   assert.equal(query.email.$in[0],email);
   if(record.setupTokenHash!==query.setupTokenHash || record.setupExpiresAt<=query.setupExpiresAt.$gt || !query.email.$in.includes(record.email))return null;
   record.password=update.$set.password;
   delete record.setupTokenHash; delete record.setupExpiresAt;
   return record;
 };
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 url='http://127.0.0.1:'+server.address().port;
});
beforeEach(()=>{
 process.env.SECRET_OR_KEY='isolated-test-only'; process.env.ADMIN_EMAILS=email;
 record={_id:id,email,name:'Admin',password:'unusable-test-hash',setupTokenHash:crypto.createHash('sha256').update(token).digest('hex'),setupExpiresAt:Date.now()+60000}; updates=0;
});
after(async()=>{
 await new Promise(resolve=>server.close(resolve));
 const User=mongoose.model('User');User.findOneAndUpdate=originals.update;User.findById=originals.find;
 for(const [key,value] of [['SECRET_OR_KEY',previous.secret],['ADMIN_EMAILS',previous.admins]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
async function setup(body){const r=await fetch(url+'/admin/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
test('setup rejects malformed tokens and short or overlong passwords before database writes',async()=>{
 for(const body of [{token:{$ne:null},password:'new-password-123'},{token,password:'short'},{token,password:'अ'.repeat(25)}])assert.equal((await setup(body)).status,400);
 assert.equal(updates,0);
});
test('setup hashes password, consumes invitation and rejects replay',async()=>{
 assert.equal((await setup({token,password:'new-password-123'})).status,200);
 assert.ok(await bcrypt.compare('new-password-123',record.password));assert.notEqual(record.password,'new-password-123');
 assert.equal(record.setupTokenHash,undefined);assert.equal(record.setupExpiresAt,undefined);
 assert.equal((await setup({token,password:'attacker-password'})).status,400);
 assert.ok(await bcrypt.compare('new-password-123',record.password));
});
test('expired setup code cannot change password',async()=>{
 record.setupExpiresAt=Date.now()-1;
 assert.equal((await setup({token,password:'new-password-123'})).status,400);assert.equal(record.password,'unusable-test-hash');
});
test('concurrent setup attempts allow exactly one winner',async()=>{
 const results=await Promise.all([setup({token,password:'first-password-123'}),setup({token,password:'second-password-123'})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
});
test('missing administrator configuration prevents setup',async()=>{
 delete process.env.ADMIN_EMAILS;
 assert.equal((await setup({token,password:'new-password-123'})).status,403);assert.equal(updates,0);
});
test('non-allowlisted invitation cannot create admin access',async()=>{
 record.email='someone@example.com';
 assert.equal((await setup({token,password:'new-password-123'})).status,400);
});
test('session endpoint checks authentication and administrator role without disclosing secrets',async()=>{
 let r=await fetch(url+'/admin/session');assert.equal(r.status,401);
 const authorization='Bearer '+jwt.sign({id},process.env.SECRET_OR_KEY,{algorithm:'HS256'});
 r=await fetch(url+'/admin/session',{headers:{authorization}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.deepEqual(await r.json(),{email,name:'Admin'});
 record.email='member@example.com';r=await fetch(url+'/admin/session',{headers:{authorization}});assert.equal(r.status,403);
});
