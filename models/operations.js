const m = require("mongoose");
const { Schema } = m;
const ref = Schema.Types.ObjectId;
const schemas = {
  Inventory: new Schema({
    _id: { type: ref, required: true },
    unit: { type: String, enum: ["set"], default: "set" },
    onHand: { type: Number, min: 0, required: true },
    reserved: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 20 },
    version: { type: Number, min: 0, default: 0 },
  }),
  StockMovement: new Schema(
    {
      _id: String,
      cardId: { type: ref, required: true },
      delta: Number,
      before: Number,
      after: Number,
      reason: String,
      note: String,
      actor: ref,
      version: Number,
      fingerprint: String,
      result: Schema.Types.Mixed,
    },
    { timestamps: true },
  ),
  MediaAsset: new Schema(
    {
      owner: { type: ref, required: true },
      publicId: String,
      url: String,
      mimeType: String,
      bytes: Number,
      width: Number,
      height: Number,
      cardId: ref,
      state: {
        type: String,
        enum: ["ready", "attached", "deleting", "cleanup"],
        required: true,
      },
    },
    { timestamps: true },
  ),
  UploadTicket: new Schema(
    {
      owner: ref,
      files: [{ _id: false, mimeType: String, size: Number }],
      expiresAt: Date,
      state: {
        type: String,
        enum: ["pending", "processing", "complete", "failed"],
        default: "pending",
      },
    },
    { timestamps: true },
  ),
  AuditEvent: new Schema(
    {
      actor: ref,
      action: String,
      cardId: ref,
      version: Number,
      details: Schema.Types.Mixed,
    },
    { timestamps: true },
  ),
  Inquiry: new Schema(
    {
      _id: String,
      cardId: ref,
      quantity: Number,
      customerName: String,
      phone: String,
      email: String,
      message: String,
      status: { type: String, default: "new" },
      notes: { type: String, default: "" },
      version: { type: Number, default: 0 },
      fingerprint: String,
      notification: {
        status: { type: String, default: "pending" },
        lastAttempt: Date,
        sentAt: Date,
        providerId: String,
      },
    },
    { timestamps: true },
  ),
};
for (const [name, schema] of Object.entries(schemas))
  if (!m.models[name]) m.model(name, schema);
