const m = require("mongoose");
const { createHash } = require("crypto");
const { fail, object, text, integer, id } = require("../utils/api");
const Post = m.model("Post"),
  Inventory = m.model("Inventory"),
  Movement = m.model("StockMovement");
const snapshot = (record, cardId) => ({
  cardId: record?._id || cardId,
  unit: "set",
  initialized: !!record,
  onHand: record?.onHand ?? null,
  reserved: record?.reserved ?? null,
  available: record ? record.onHand - record.reserved : null,
  lowStockThreshold: record?.lowStockThreshold ?? null,
  version: record?.version ?? null,
});
async function initialize(cardId, body, actor) {
  id(cardId);
  object(body, ["unit", "onHand", "expectedLegacyStock", "lowStockThreshold"]);
  if (body.unit !== "set") fail(422, "INVALID_INPUT", "Confirm unit set");
  const onHand = integer(body.onHand, "onHand"),
    threshold = integer(body.lowStockThreshold ?? 20, "lowStockThreshold");
  if (body.expectedLegacyStock !== null)
    integer(body.expectedLegacyStock, "expectedLegacyStock");
  return m.connection.transaction(async (session) => {
    const card = await Post.findById(cardId).session(session);
    if (!card) fail(404, "NOT_FOUND", "Card not found");
    if (await Inventory.exists({ _id: cardId }).session(session))
      fail(409, "ALREADY_INITIALIZED", "Inventory is already initialized");
    if ((card.stock ?? null) !== body.expectedLegacyStock)
      fail(409, "VERSION_CONFLICT", "Legacy stock changed");
    const [inv] = await Inventory.create(
      [
        {
          _id: cardId,
          onHand,
          reserved: 0,
          unit: "set",
          version: 0,
          lowStockThreshold: threshold,
        },
      ],
      { session },
    );
    const result = snapshot(inv);
    const [movement] = await Movement.create(
      [
        {
          _id: createHash("sha256")
            .update("initialize:" + cardId)
            .digest("hex"),
          cardId,
          delta: onHand,
          before: 0,
          after: onHand,
          reason: "initialization",
          note: "Confirmed legacy stock mapping to sets",
          actor,
          version: 0,
          result,
        },
      ],
      { session },
    );
    await Post.updateOne(
      { _id: cardId },
      { $set: { stock: onHand, updatedAt: new Date() }, $inc: { version: 1 } },
      { session },
    );
    return { inventory: result, movement: movement.toObject() };
  });
}
async function adjust(cardId, body, actor) {
  id(cardId);
  object(body, [
    "delta",
    "reason",
    "note",
    "expectedVersion",
    "idempotencyKey",
  ]);
  if (
    !Number.isSafeInteger(body.delta) ||
    !body.delta ||
    Math.abs(body.delta) > 10000000
  )
    fail(422, "INVALID_INPUT", "Nonzero integer delta required");
  const expected = integer(body.expectedVersion, "expectedVersion");
  if (!["purchase", "sale", "wastage", "correction"].includes(body.reason))
    fail(422, "INVALID_INPUT", "Invalid adjustment reason");
  const note =
      body.note === undefined || body.note === ""
        ? ""
        : text(body.note, "note", 500),
    key = text(body.idempotencyKey, "idempotencyKey", 100);
  if (key.length < 8) fail(422, "INVALID_INPUT", "Idempotency key too short");
  const movementId = createHash("sha256")
    .update(cardId + ":" + key)
    .digest("hex");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        actor: String(actor),
        delta: body.delta,
        reason: body.reason,
        note,
        expected,
      }),
    )
    .digest("hex");
  return m.connection.transaction(async (session) => {
    const previous = await Movement.findById(movementId)
      .session(session)
      .lean();
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        fail(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Key used for a different adjustment",
        );
      return { inventory: previous.result, movement: previous, replayed: true };
    }
    const inv = await Inventory.findById(cardId).session(session);
    if (!inv)
      fail(409, "NOT_INITIALIZED", "Confirm stock units before adjustments");
    if (inv.version !== expected)
      fail(409, "VERSION_CONFLICT", "Stock changed; reload before adjusting");
    const next = inv.onHand + body.delta;
    if (!Number.isSafeInteger(next) || next < inv.reserved || next > 10000000)
      fail(
        409,
        "INSUFFICIENT_STOCK",
        "Adjustment would violate available stock",
      );
    const updated = await Inventory.findOneAndUpdate(
      { _id: cardId, version: expected },
      { $inc: { onHand: body.delta, version: 1 } },
      { session, new: true, runValidators: true },
    );
    if (!updated) fail(409, "VERSION_CONFLICT", "Stock changed");
    const result = snapshot(updated);
    const [movement] = await Movement.create(
      [
        {
          _id: movementId,
          cardId,
          delta: body.delta,
          before: inv.onHand,
          after: next,
          reason: body.reason,
          note,
          actor,
          version: updated.version,
          fingerprint,
          result,
        },
      ],
      { session },
    );
    const card = await Post.updateOne(
      { _id: cardId },
      { $set: { stock: next, updatedAt: new Date() }, $inc: { version: 1 } },
      { session },
    );
    if (!card.matchedCount) fail(404, "NOT_FOUND", "Card not found");
    return {
      inventory: result,
      movement: movement.toObject(),
      replayed: false,
    };
  });
}
module.exports = { snapshot, initialize, adjust };
