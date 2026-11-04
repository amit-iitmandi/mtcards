const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const m = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sharp = require("sharp");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { createApp } = require("../server");
let replica,
  server,
  url,
  admin,
  member,
  token,
  memberToken,
  Post,
  Inv,
  Movement,
  Asset,
  Ticket,
  Inquiry;
let uploads, deletes, notifications, failUpload, failNotification, testProvider;
const secret = crypto.randomBytes(32).toString("hex");
const dbName = "mtcards_test_" + crypto.randomBytes(6).toString("hex");
before(async () => {
  process.env.SECRET_OR_KEY = secret;
  process.env.ADMIN_EMAILS = "admin@example.com";
  process.env.NODE_ENV = "test";
  replica = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      args: [
        "--nounixsocket",
        "--setParameter",
        "diagnosticDataCollectionEnabled=false",
      ],
    },
    binary: { version: "8.0.17" },
  });
  await m.connect(replica.getUri(), { dbName, autoIndex: false });
  assert.match(m.connection.name, /^mtcards_test_/);
  const app = createApp({
    env: { CORS_ORIGINS: "https://frontend.example.com" },
  });
  Post = m.model("Post");
  Inv = m.model("Inventory");
  Movement = m.model("StockMovement");
  Asset = m.model("MediaAsset");
  Ticket = m.model("UploadTicket");
  Inquiry = m.model("Inquiry");
  for (const model of Object.values(m.models)) await model.createCollection();
  require("../services/media").setTestProvider(
    (testProvider = {
      upload: async (buffer, publicId) => {
        uploads++;
        if (failUpload) throw Error("private provider failure");
        return {
          public_id: publicId,
          secure_url:
            "https://res.cloudinary.com/test/image/upload/" + publicId + ".png",
        };
      },
      destroy: async () => {
        deletes++;
        return { result: "ok" };
      },
    }),
  );
  require("../services/inquiries").setTestSender(async (payload, key) => {
    notifications++;
    if (failNotification) throw Error("private email failure");
    assert.equal(typeof key, "string");
    return { id: "test-provider-id" };
  });
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  url = "http://127.0.0.1:" + server.address().port;
});
beforeEach(async () => {
  assert.match(m.connection.name, /^mtcards_test_/);
  for (const model of Object.values(m.models)) await model.deleteMany({});
  const password = await bcrypt.hash("integration-password", 4);
  admin = await m
    .model("User")
    .create({ name: "Admin", email: "admin@example.com", password });
  member = await m
    .model("User")
    .create({ name: "Member", email: "member@example.com", password });
  token =
    "Bearer " + jwt.sign({ id: admin._id, sv: 0 }, secret, { expiresIn: "1h" });
  memberToken =
    "Bearer " +
    jwt.sign({ id: member._id, sv: 0 }, secret, { expiresIn: "1h" });
  uploads = deletes = notifications = 0;
  failUpload = failNotification = false;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (m.connection.readyState) {
    assert.match(m.connection.name, /^mtcards_test_/);
    await m.connection.dropDatabase();
    await m.disconnect();
  }
  if (replica) await replica.stop();
});
async function req(path, { method = "GET", body, auth = token } = {}) {
  const headers = { Origin: "https://frontend.example.com" };
  if (auth) headers.Authorization = auth;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(url + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}
const details = {
  title: "Hindi card 101",
  type1: "Hindu Wedding Card",
  type2: "Single Card",
  cPrice: "15.00",
  sPrice: "12.00",
  description: "Test card",
};
async function legacy() {
  return Post.create({
    ...details,
    stock: 100,
    image: ["https://example.com/legacy.jpg"],
  });
}
async function init(card) {
  return req("/admin/inventory/" + card._id + "/initialize", {
    method: "POST",
    body: { unit: "set", onHand: 100, expectedLegacyStock: 100 },
  });
}
async function newCard() {
  const result = await req("/admin/cards", {
    method: "POST",
    body: { ...details, status: "draft" },
  });
  assert.equal(result.status, 201);
  return result.body.card;
}
async function imageAsset() {
  const buffer = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const issued = await req("/admin/uploads/sign", {
    method: "POST",
    body: { files: [{ mimeType: "image/png", size: buffer.length }] },
  });
  assert.equal(issued.status, 201);
  const form = new FormData();
  form.append("files", new Blob([buffer], { type: "image/png" }), "card.png");
  const r = await fetch(url + issued.body.uploadUrl, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });
  return {
    response: { status: r.status, body: await r.json() },
    ticket: issued.body,
    buffer,
  };
}

test("anonymous/non-admin callers cannot use management or upload endpoints", async () => {
  const id = new m.Types.ObjectId();
  for (const auth of [null, memberToken])
    for (const [path, method] of [
      ["/admin/cards", "POST"],
      ["/admin/cards/" + id, "PATCH"],
      ["/admin/cards/" + id, "DELETE"],
      ["/admin/uploads/sign", "POST"],
      ["/admin/uploads", "POST"],
      ["/admin/inventory/" + id + "/adjustments", "POST"],
      ["/admin/summary", "GET"],
      ["/admin/enquiries", "GET"],
    ]) {
      const result = await req(path, {
        method,
        body: method === "GET" ? undefined : {},
        auth,
      });
      assert.equal(result.status, auth ? 403 : 401);
      assert.equal(typeof result.body.code, "string");
      assert.equal(typeof result.body.requestId, "string");
    }
  assert.equal(await Post.countDocuments(), 0);
  assert.equal(uploads, 0);
});
test("legacy records stay intact; admin editing uses versions, rejects stock bypass and public data excludes private fields", async () => {
  const card = await legacy();
  const list = await req("/cards?q=Hindi&page=1&limit=1", { auth: null });
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].sPrice, undefined);
  assert.equal(list.body.items[0].stock, undefined);
  assert.equal(list.body.items[0].version, 0);
  const updated = await req("/admin/cards/" + card._id, {
    method: "PATCH",
    body: { expectedVersion: 0, title: "Updated card" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.card.version, 1);
  assert.deepEqual(updated.body.card.image, card.image);
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "PATCH",
        body: { expectedVersion: 0, title: "Stale edit" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "PATCH",
        body: { expectedVersion: 1, stock: 999 },
      })
    ).status,
    422,
  );
  assert.equal((await Post.findById(card._id)).stock, 100);
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "DELETE",
        body: { expectedVersion: 1 },
      })
    ).status,
    200,
  );
  assert.equal((await req("/cards/" + card._id, { auth: null })).status, 404);
  assert.ok(await Post.findById(card._id));
});
test("literal search and pagination do not execute user regex or accept operators", async () => {
  await legacy();
  assert.equal((await req("/cards?q=.*", { auth: null })).body.total, 0);
  assert.equal((await req("/admin/cards?page=0")).status, 422);
  assert.equal(
    (
      await req("/admin/cards", {
        method: "POST",
        body: { ...details, status: "draft", $set: { stock: 99 } },
      })
    ).status,
    422,
  );
});
test("new drafts start at zero sets and cannot publish without managed images", async () => {
  const card = await newCard();
  assert.equal((await Inv.findById(card._id)).onHand, 0);
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "PATCH",
        body: { expectedVersion: 0, status: "published" },
      })
    ).status,
    422,
  );
});
test("historical stock requires explicit initialization; repeated/mismatched initialization is rejected", async () => {
  const card = await legacy();
  let list = await req("/admin/inventory");
  assert.equal(list.body.items[0].initialized, false);
  assert.equal(list.body.items[0].onHand, null);
  assert.equal((await Post.findById(card._id)).stock, 100);
  assert.equal(
    (
      await req("/admin/inventory/" + card._id + "/initialize", {
        method: "POST",
        body: { unit: "set", onHand: 100, expectedLegacyStock: 99 },
      })
    ).status,
    409,
  );
  assert.equal((await init(card)).status, 201);
  assert.equal((await init(card)).status, 409);
  assert.equal(await Movement.countDocuments(), 1);
});
test("concurrent deductions cannot oversell, idempotency replays once, stale/negative requests fail", async () => {
  const card = await legacy();
  await init(card);
  const body = {
    delta: -60,
    reason: "sale",
    note: "Test sale",
    expectedVersion: 0,
    idempotencyKey: "sale-key-0001",
  };
  const results = await Promise.all([
    req("/admin/inventory/" + card._id + "/adjustments", {
      method: "POST",
      body,
    }),
    req("/admin/inventory/" + card._id + "/adjustments", {
      method: "POST",
      body: { ...body, idempotencyKey: "sale-key-0002" },
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await Inv.findById(card._id)).onHand, 40);
  assert.equal((await Post.findById(card._id)).stock, 40);
  assert.equal(await Movement.countDocuments(), 2);
  const winner =
    results[0].status === 201
      ? body
      : { ...body, idempotencyKey: "sale-key-0002" };
  const replay = await req("/admin/inventory/" + card._id + "/adjustments", {
    method: "POST",
    body: winner,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replayed, true);
  assert.equal(
    (
      await req("/admin/inventory/" + card._id + "/adjustments", {
        method: "POST",
        body: { ...winner, delta: -1 },
      })
    ).body.code,
    "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(
    (
      await req("/admin/inventory/" + card._id + "/adjustments", {
        method: "POST",
        body: { ...body, expectedVersion: 1, idempotencyKey: "sale-key-0003" },
      })
    ).body.code,
    "INSUFFICIENT_STOCK",
  );
});
test("failed ledger insertion rolls back both inventory and legacy stock", async () => {
  const card = await legacy();
  await init(card);
  const original = Movement.create;
  Movement.create = async () => {
    throw Error("forced ledger failure");
  };
  try {
    assert.equal(
      (
        await req("/admin/inventory/" + card._id + "/adjustments", {
          method: "POST",
          body: {
            delta: 10,
            reason: "purchase",
            expectedVersion: 0,
            idempotencyKey: "rollback-0001",
          },
        })
      ).status,
      500,
    );
  } finally {
    Movement.create = original;
  }
  assert.equal((await Inv.findById(card._id)).onHand, 100);
  assert.equal((await Post.findById(card._id)).stock, 100);
  assert.equal(await Movement.countDocuments(), 1);
});
test("signed backend image upload checks content, single-use tickets and asset ownership", async () => {
  const { response, ticket, buffer } = await imageAsset();
  assert.equal(response.status, 201);
  assert.equal(uploads, 1);
  const assetId = response.body.assets[0].id;
  const form = new FormData();
  form.append("files", new Blob([buffer], { type: "image/png" }), "card.png");
  let r = await fetch(url + ticket.uploadUrl, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });
  assert.equal(r.status, 409);
  assert.equal(uploads, 1);
  const card = await newCard();
  r = await req("/admin/cards/" + card._id, {
    method: "PATCH",
    body: { expectedVersion: 0, imageAssetIds: [assetId], status: "published" },
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await req("/admin/uploads/" + assetId, { method: "DELETE" })).status,
    409,
  );
  assert.equal(deletes, 0);
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "PATCH",
        body: { expectedVersion: 1, imageAssetIds: [], status: "draft" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await req("/admin/uploads/" + assetId, { method: "DELETE" })).status,
    200,
  );
  assert.equal(deletes, 1);
});
test("forged images, expired tickets and count/size limits are rejected before provider access", async () => {
  assert.equal(
    (
      await req("/admin/uploads/sign", {
        method: "POST",
        body: { files: [{ mimeType: "image/svg+xml", size: 20 }] },
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await req("/admin/uploads/sign", {
        method: "POST",
        body: { files: [{ mimeType: "image/png", size: 6 * 1024 * 1024 }] },
      })
    ).status,
    422,
  );
  const declared = { mimeType: "image/png", size: 10 };
  const issued = await req("/admin/uploads/sign", {
    method: "POST",
    body: { files: [declared] },
  });
  let form = new FormData();
  form.append(
    "files",
    new Blob(["fake-image"], { type: "image/png" }),
    "fake.png",
  );
  let r = await fetch(url + issued.body.uploadUrl, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });
  assert.equal(r.status, 415);
  assert.equal(uploads, 0);
  await Ticket.updateOne(
    { _id: issued.body.ticketId },
    { $set: { expiresAt: new Date(0) } },
  );
  form = new FormData();
  form.append(
    "files",
    new Blob(["fake-image"], { type: "image/png" }),
    "fake.png",
  );
  r = await fetch(url + issued.body.uploadUrl, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });
  assert.equal(r.status, 409);
});
test("asset from another admin cannot attach; failed upload is recorded for cleanup", async () => {
  const asset = await Asset.create({
    owner: member._id,
    state: "ready",
    url: "https://res.cloudinary.com/test/image/upload/a.png",
    publicId: "test-a",
  });
  const card = await newCard();
  assert.equal(
    (
      await req("/admin/cards/" + card._id, {
        method: "PATCH",
        body: { expectedVersion: 0, imageAssetIds: [String(asset._id)] },
      })
    ).status,
    409,
  );
  failUpload = true;
  const result = await imageAsset();
  assert.equal(result.response.status, 503);
  assert.equal(await Asset.countDocuments({ state: "cleanup" }), 1);
});
test("inquiry persistence survives notification failure; retries deduplicate and status edits use versions", async () => {
  const card = await legacy();
  failNotification = true;
  const body = {
    cardId: String(card._id),
    quantity: 250,
    customerName: "Test customer",
    phone: "9876543210",
    message: "Test only",
    idempotencyKey: "inquiry-0001",
  };
  const created = await req("/enquiries", { method: "POST", auth: null, body });
  assert.equal(created.status, 201);
  assert.equal(created.body.notification.status, "failed");
  assert.equal(await Inquiry.countDocuments(), 1);
  const replay = await req("/enquiries", { method: "POST", auth: null, body });
  assert.equal(replay.status, 200);
  assert.equal(notifications, 1);
  failNotification = false;
  assert.equal(
    (
      await req("/admin/enquiries/" + created.body.id + "/notification", {
        method: "POST",
        body: {},
      })
    ).body.notification.status,
    "sent",
  );
  assert.equal(notifications, 2);
  assert.equal(
    (
      await req("/admin/enquiries/" + created.body.id + "/notification", {
        method: "POST",
        body: {},
      })
    ).body.notification.status,
    "sent",
  );
  assert.equal(notifications, 2);
  assert.equal(
    (
      await req("/admin/enquiries/" + created.body.id, {
        method: "PATCH",
        body: { expectedVersion: 0, status: "contacted", notes: "Called" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await req("/admin/enquiries/" + created.body.id, {
        method: "PATCH",
        body: { expectedVersion: 0, status: "closed" },
      })
    ).status,
    409,
  );
});
test("summary reports all records and separates unknown historical stock", async () => {
  const old = await legacy();
  const card = await newCard();
  await req("/admin/inventory/" + card._id + "/adjustments", {
    method: "POST",
    body: {
      delta: 10,
      reason: "purchase",
      expectedVersion: 0,
      idempotencyKey: "summary-purchase",
    },
  });
  const summary = await req("/admin/summary");
  assert.equal(summary.status, 200);
  assert.equal(summary.body.designs.total, 2);
  assert.equal(summary.body.inventory.onHand, 10);
  assert.equal(summary.body.inventory.uninitializedCards, 1);
  assert.equal(summary.body.inventory.lowStockCards, 1);
  assert.equal(String(old._id).length, 24);
});
test("login/current-user/logout revoke server-side sessions", async () => {
  const login = await req("/login", {
    method: "POST",
    auth: null,
    body: { email: "admin@example.com", userPass: "integration-password" },
  });
  assert.equal(login.status, 200);
  const auth = login.body.token;
  assert.equal((await req("/me", { auth })).body.user.isAdmin, true);
  assert.equal(
    (await req("/logout", { method: "POST", body: {}, auth })).status,
    200,
  );
  assert.equal((await req("/admin/session", { auth })).status, 401);
});

test("encrypted backup restores IDs, records and indexes into an empty isolated database", async () => {
  const card = await legacy();
  await init(card);
  const { createBackup, restoreBackup } = require("../services/backup");
  const key = crypto.randomBytes(32),
    client = m.connection.getClient();
  const encrypted = await createBackup(client, dbName, key);
  assert.ok(!encrypted.toString().includes("admin@example.com"));
  const target = "mtcards_restore_" + crypto.randomBytes(6).toString("hex");
  try {
    const result = await restoreBackup(client, target, encrypted, key);
    assert.equal(result.counts.posts, 1);
    const restored = await client
      .db(target)
      .collection("posts")
      .findOne({ _id: card._id });
    assert.equal(restored.stock, 100);
    assert.equal(String(restored._id), String(card._id));
    await assert.rejects(
      restoreBackup(client, target, encrypted, key),
      /empty/,
    );
    await assert.rejects(
      restoreBackup(client, "mtcards_demo", encrypted, key),
      /isolated/,
    );
    await assert.rejects(
      restoreBackup(
        client,
        "mtcards_restore_wrong_key",
        encrypted,
        crypto.randomBytes(32),
      ),
    );
  } finally {
    await client.db(target).dropDatabase();
  }
});
test("stock cannot consume reserved sets and movements paginate without hidden internals", async () => {
  const card = await legacy();
  await init(card);
  await Inv.updateOne({ _id: card._id }, { $set: { reserved: 90 } });
  const result = await req("/admin/inventory/" + card._id + "/adjustments", {
    method: "POST",
    body: {
      delta: -11,
      reason: "sale",
      expectedVersion: 0,
      idempotencyKey: "reserved-deduction",
    },
  });
  assert.equal(result.status, 409);
  assert.equal((await Inv.findById(card._id)).onHand, 100);
  const history = await req(
    "/admin/inventory/" + card._id + "/movements?page=1&limit=1",
  );
  assert.equal(history.body.total, 1);
  assert.equal(history.body.items[0].fingerprint, undefined);
  assert.equal(history.body.items[0].result, undefined);
});
test("parallel attach/delete cannot leave a card referencing a deleted image", async () => {
  const { response } = await imageAsset();
  const assetId = response.body.assets[0].id,
    card = await newCard();
  const results = await Promise.all([
    req("/admin/cards/" + card._id, {
      method: "PATCH",
      body: { expectedVersion: 0, imageAssetIds: [assetId] },
    }),
    req("/admin/uploads/" + assetId, { method: "DELETE" }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const saved = await Post.findById(card._id);
  if (saved.imageAssetIds.length) assert.ok(await Asset.findById(assetId));
  else assert.equal(await Asset.findById(assetId), null);
});

test("inventory filters use exact set balances and keep uninitialized stock separate", async () => {
  await legacy();
  const card = await newCard();
  assert.equal((await req("/admin/inventory?stock=unknown")).body.total, 1);
  assert.equal((await req("/admin/inventory?stock=out")).body.total, 1);
  assert.equal((await req("/admin/inventory?stock=low")).body.total, 0);
  await req("/admin/inventory/" + card._id + "/adjustments", {
    method: "POST",
    body: {
      delta: 5,
      reason: "purchase",
      expectedVersion: 0,
      idempotencyKey: "filter-purchase",
    },
  });
  assert.equal((await req("/admin/inventory?stock=low")).body.total, 1);
});

test("missing image credentials fail closed before creating tickets or receiving files", async () => {
  const media = require("../services/media");
  const keys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const previous = keys.map((key) => process.env[key]);
  media.setTestProvider(null);
  for (const key of keys) delete process.env[key];
  try {
    const sign = await req("/admin/uploads/sign", {
      method: "POST",
      body: { files: [{ mimeType: "image/png", size: 100 }] },
    });
    assert.equal(sign.status, 503);
    assert.equal(sign.body.code, "DEPENDENCY_UNAVAILABLE");
    assert.equal(await Ticket.countDocuments(), 0);
    assert.equal(
      (await req("/admin/uploads", { method: "POST", body: {} })).status,
      503,
    );
    assert.equal(uploads, 0);
  } finally {
    media.setTestProvider(testProvider);
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
