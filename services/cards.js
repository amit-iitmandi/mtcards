const m = require("mongoose");
const { fail, object, text, integer, id, literal } = require("../utils/api");
const Post = m.model("Post"),
  Inventory = m.model("Inventory"),
  Movement = m.model("StockMovement"),
  Asset = m.model("MediaAsset"),
  Audit = m.model("AuditEvent");
const statusOf = (card) => card.status || "published";
function present(card, admin = false) {
  const c = {
    _id: card._id,
    title: card.title,
    type1: card.type1,
    type2: card.type2,
    description: card.description || "",
    cPrice: card.cPrice,
    image: card.image || [],
    status: statusOf(card),
    version: card.version || 0,
    updatedAt: card.updatedAt,
  };
  if (admin)
    Object.assign(c, {
      sPrice: card.sPrice,
      stock: card.stock,
      imageAssetIds: card.imageAssetIds || [],
    });
  return c;
}
function filter(query, admin) {
  const result = {};
  if (query.q) {
    const q = text(query.q, "q", 120);
    result.title = { $regex: literal(q), $options: "i" };
  }
  if (query.category) result.type1 = text(query.category, "category", 100);
  if (query.format) result.type2 = text(query.format, "format", 100);
  if (query.status) {
    if (!admin || !["draft", "published", "archived"].includes(query.status))
      fail(422, "INVALID_INPUT", "Invalid status");
    result.status = query.status;
  }
  if (!admin || query.status === "published") {
    delete result.status;
    result.$or = [{ status: "published" }, { status: { $exists: false } }];
  }
  return result;
}
const versionMatch = (version) =>
  version === 0
    ? { $or: [{ version: 0 }, { version: { $exists: false } }] }
    : { version };
function fields(body, patch = false) {
  object(body, [
    "title",
    "type1",
    "type2",
    "description",
    "cPrice",
    "sPrice",
    "status",
    "imageAssetIds",
    ...(patch ? ["expectedVersion"] : []),
  ]);
  const result = {};
  for (const [key, max] of [
    ["title", 120],
    ["type1", 100],
    ["type2", 100],
    ["cPrice", 40],
    ["sPrice", 40],
  ])
    if (!patch || body[key] !== undefined)
      result[key] = text(body[key], key, max);
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 3000)
      fail(422, "INVALID_INPUT", "Invalid description");
    result.description = body.description.trim();
  }
  for (const key of ["cPrice", "sPrice"])
    if (result[key] !== undefined && !/^\d{1,8}(\.\d{1,2})?$/.test(result[key]))
      fail(422, "INVALID_INPUT", "Invalid price", {
        [key]: "Nonnegative INR amount with up to two decimals",
      });
  if (body.status !== undefined) {
    if (!["draft", "published", "archived"].includes(body.status))
      fail(422, "INVALID_INPUT", "Invalid status");
    result.status = body.status;
  }
  return result;
}
async function attach(card, assetIds, actor, session) {
  if (
    !Array.isArray(assetIds) ||
    assetIds.length > 12 ||
    new Set(assetIds).size !== assetIds.length
  )
    fail(422, "INVALID_INPUT", "Invalid image asset list");
  for (const a of assetIds) id(a);
  const assets = [];
  for (const assetId of assetIds) {
    const asset = await Asset.findOneAndUpdate(
      {
        _id: assetId,
        owner: actor,
        state: { $in: ["ready", "attached"] },
        $or: [{ cardId: card._id }, { cardId: null }],
      },
      { $set: { state: "attached", cardId: card._id } },
      { new: true, session },
    );
    if (!asset)
      fail(
        409,
        "ASSET_UNAVAILABLE",
        "Image is unavailable or belongs to another card",
      );
    assets.push(asset);
  }
  await Asset.updateMany(
    { cardId: card._id, _id: { $nin: assetIds }, state: "attached" },
    { $set: { state: "ready" }, $unset: { cardId: "" } },
    { session },
  );
  card.imageAssetIds = assets.map((a) => a._id);
  card.image = assets.map((a) => a.url);
}
async function create(body, actor) {
  const data = fields(body);
  data.status = data.status || "draft";
  return m.connection.transaction(async (session) => {
    const card = new Post({
      ...data,
      stock: 0,
      version: 0,
      image: [],
      updatedAt: new Date(),
    });
    if (body.imageAssetIds !== undefined)
      await attach(card, body.imageAssetIds, actor, session);
    if (data.status === "published" && !card.image.length)
      fail(422, "INVALID_INPUT", "Published cards need an image");
    await card.save({ session });
    await Inventory.create(
      [{ _id: card._id, onHand: 0, reserved: 0, unit: "set", version: 0 }],
      { session },
    );
    await Audit.create(
      [{ actor, action: "card.create", cardId: card._id, version: 0 }],
      { session },
    );
    return present(card.toObject(), true);
  });
}
async function update(cardId, body, actor) {
  id(cardId);
  const data = fields(body, true);
  const expected = integer(body.expectedVersion, "expectedVersion");
  if (!Object.keys(data).length && body.imageAssetIds === undefined)
    fail(422, "INVALID_INPUT", "No changes supplied");
  return m.connection.transaction(async (session) => {
    const card = await Post.findById(cardId).session(session);
    if (!card) fail(404, "NOT_FOUND", "Card not found");
    if ((card.version || 0) !== expected)
      fail(409, "VERSION_CONFLICT", "Card changed; reload before saving");
    if (body.imageAssetIds !== undefined)
      await attach(card, body.imageAssetIds, actor, session);
    Object.assign(card, data);
    if (statusOf(card) === "published" && !card.image.length)
      fail(422, "INVALID_INPUT", "Published cards need an image");
    const result = await Post.findOneAndUpdate(
      { _id: cardId, ...versionMatch(expected) },
      {
        $set: {
          ...data,
          image: card.image,
          imageAssetIds: card.imageAssetIds,
          updatedAt: new Date(),
          version: expected + 1,
        },
      },
      { new: true, session, runValidators: true },
    ).lean();
    if (!result)
      fail(409, "VERSION_CONFLICT", "Card changed; reload before saving");
    await Audit.create(
      [
        {
          actor,
          action: "card.update",
          cardId,
          version: expected + 1,
          details: {
            fields: Object.keys(data),
            imagesChanged: body.imageAssetIds !== undefined,
          },
        },
      ],
      { session },
    );
    return present(result, true);
  });
}
module.exports = { present, filter, versionMatch, create, update };
