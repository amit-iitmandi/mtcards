const { randomBytes, createCipheriv, createDecipheriv } = require("crypto");
const { gzipSync, gunzipSync } = require("zlib");
const { BSON } = require("mongoose").mongo;
function keyBytes(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw Error("A 32-byte backup encryption key is required");
  return key;
}
async function createBackup(client, source, key) {
  keyBytes(key);
  if (typeof source !== "string" || !/^[a-zA-Z0-9_-]+$/.test(source))
    throw Error("Explicit source database required");
  const db = client.db(source);
  const collections = await db
    .listCollections({ type: "collection" })
    .toArray();
  const manifest = [];
  for (const item of collections) {
    if (item.name.startsWith("system.")) continue;
    const indexes = await db.collection(item.name).listIndexes().toArray();
    manifest.push({
      name: item.name,
      options: item.options,
      indexes: indexes
        .filter((i) => i.name !== "_id_")
        .map(({ v, ns, ...rest }) => rest),
      documents: [],
    });
  }
  const session = client.startSession();
  try {
    await session.withTransaction(
      async () => {
        for (const item of manifest) {
          item.documents = await db
            .collection(item.name)
            .find({}, { session })
            .limit(100001)
            .toArray();
          if (item.documents.length > 100000)
            throw Error("Backup size limit exceeded");
        }
      },
      { readConcern: { level: "snapshot" } },
    );
  } finally {
    await session.endSession();
  }
  const plain = Buffer.from(
    BSON.EJSON.stringify(
      {
        format: "mtcards-backup-v1",
        source,
        createdAt: new Date(),
        collections: manifest,
      },
      { relaxed: false },
    ),
  );
  if (plain.length > 128 * 1024 * 1024)
    throw Error("Backup byte limit exceeded");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(gzipSync(plain)),
    cipher.final(),
  ]);
  return Buffer.from(
    JSON.stringify({
      format: "mtcards-encrypted-v1",
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    }),
  );
}
async function restoreBackup(client, target, encrypted, key) {
  keyBytes(key);
  if (!/^mtcards_restore_[a-zA-Z0-9_]+$/.test(target))
    throw Error(
      "Restore target must be an isolated mtcards_restore_* database",
    );
  const envelope = JSON.parse(encrypted.toString());
  if (envelope.format !== "mtcards-encrypted-v1")
    throw Error("Invalid backup format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const compressed = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  const manifest = BSON.EJSON.parse(
    gunzipSync(compressed, { maxOutputLength: 128 * 1024 * 1024 }).toString(),
    { relaxed: false },
  );
  if (
    manifest.format !== "mtcards-backup-v1" ||
    !Array.isArray(manifest.collections)
  )
    throw Error("Invalid backup manifest");
  const db = client.db(target);
  if ((await db.listCollections().toArray()).length)
    throw Error("Restore target must be empty");
  for (const item of manifest.collections) {
    if (
      typeof item.name !== "string" ||
      item.name.startsWith("system.") ||
      !Array.isArray(item.documents)
    )
      throw Error("Invalid collection manifest");
    await db.createCollection(item.name, item.options);
    if (item.indexes.length)
      await db.collection(item.name).createIndexes(item.indexes);
  }
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of manifest.collections)
        if (item.documents.length)
          await db
            .collection(item.name)
            .insertMany(item.documents, { session });
    });
  } finally {
    await session.endSession();
  }
  const counts = {};
  for (const item of manifest.collections) {
    counts[item.name] = await db.collection(item.name).countDocuments();
    if (counts[item.name] !== item.documents.length)
      throw Error("Restored counts do not match");
  }
  return { source: manifest.source, target, counts };
}
module.exports = { createBackup, restoreBackup };
