const m = require("mongoose");
const { createHash } = require("crypto");
const { fail, object, text, integer, id } = require("../utils/api");
const Inquiry = m.model("Inquiry"),
  Post = m.model("Post");
let sender;
const configured = () =>
  !!(
    process.env.RESEND_API_KEY &&
    process.env.INQUIRY_NOTIFY_FROM &&
    process.env.INQUIRY_NOTIFY_TO
  );
async function notify(record) {
  if (record.notification.status === "sent") return record.notification;
  if (!configured() && !sender) {
    await Inquiry.updateOne(
      { _id: record._id },
      { $set: { "notification.status": "disabled" } },
    );
    return { status: "disabled" };
  }
  if (Date.now() - new Date(record.createdAt).getTime() > 23 * 3600000)
    fail(
      409,
      "NOTIFICATION_REVIEW_REQUIRED",
      "Notification retry needs manual review outside provider deduplication window",
    );
  await Inquiry.updateOne(
    { _id: record._id },
    {
      $set: {
        "notification.status": "pending",
        "notification.lastAttempt": new Date(),
      },
    },
  );
  try {
    const payload = {
      from: process.env.INQUIRY_NOTIFY_FROM,
      to: [process.env.INQUIRY_NOTIFY_TO],
      subject: "MTcards: new card inquiry",
      text: `Inquiry: ${record._id}\nCard: ${record.cardId}\nQuantity (sets): ${record.quantity}\nCustomer: ${record.customerName}\nPhone: ${record.phone || ""}\nEmail: ${record.email || ""}\nMessage: ${record.message || ""}`,
    };
    const result = sender
      ? await sender(payload, record._id)
      : await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
            "Idempotency-Key": "inquiry-" + record._id,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        }).then(async (r) => {
          if (!r.ok) throw Error("Notification failed");
          return r.json();
        });
    if (!result.id) throw Error("No provider acknowledgment");
    const notification = {
      status: "sent",
      sentAt: new Date(),
      providerId: result.id,
    };
    await Inquiry.updateOne({ _id: record._id }, { $set: { notification } });
    return notification;
  } catch {
    await Inquiry.updateOne(
      { _id: record._id, "notification.status": { $ne: "sent" } },
      { $set: { "notification.status": "failed" } },
    );
    const current = await Inquiry.findById(record._id).lean();
    return { status: current?.notification?.status || "failed" };
  }
}
async function create(body) {
  object(body, [
    "cardId",
    "quantity",
    "customerName",
    "phone",
    "email",
    "message",
    "idempotencyKey",
  ]);
  id(body.cardId);
  const quantity = integer(body.quantity, "quantity", 1, 1000000),
    customerName = text(body.customerName, "customerName", 120);
  const optional = (value, name, max) =>
    value === undefined || value === "" ? "" : text(value, name, max);
  const phone = optional(body.phone, "phone", 30),
    email = optional(body.email, "email", 254);
  if (
    (phone && !/^\+?[\d ()-]{7,25}$/.test(phone)) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (!phone && !email)
  )
    fail(422, "INVALID_INPUT", "Provide a valid customer phone or email");
  const message = optional(body.message, "message", 2000),
    key = text(body.idempotencyKey, "idempotencyKey", 100);
  if (key.length < 8) fail(422, "INVALID_INPUT", "Idempotency key too short");
  const data = {
      cardId: body.cardId,
      quantity,
      customerName,
      phone,
      email,
      message,
    },
    fingerprint = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex"),
    _id = createHash("sha256")
      .update("inquiry:" + key)
      .digest("hex");
  let record = await Inquiry.findById(_id);
  if (record) {
    if (record.fingerprint !== fingerprint)
      fail(409, "IDEMPOTENCY_CONFLICT", "Key used for a different inquiry");
    return {
      id: record._id,
      status: record.status,
      notification: { status: record.notification.status },
      replayed: true,
    };
  }
  if (
    !(await Post.exists({
      _id: body.cardId,
      $or: [{ status: "published" }, { status: { $exists: false } }],
    }))
  )
    fail(404, "NOT_FOUND", "Card not found");
  try {
    record = await Inquiry.create({
      _id,
      ...data,
      fingerprint,
      notification: { status: "pending" },
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    record = await Inquiry.findById(_id);
    if (record.fingerprint !== fingerprint)
      fail(409, "IDEMPOTENCY_CONFLICT", "Key used for a different inquiry");
    return {
      id: record._id,
      status: record.status,
      notification: { status: record.notification.status },
      replayed: true,
    };
  }
  const notification = await notify(record);
  return {
    id: record._id,
    status: record.status,
    notification: { status: notification.status },
    replayed: false,
  };
}
module.exports = {
  create,
  notify,
  setTestSender: (value) => {
    sender = value;
  },
};
