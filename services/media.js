const m = require("mongoose");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const { randomUUID } = require("crypto");
const { fail, object, integer, id } = require("../utils/api");
const Ticket = m.model("UploadTicket"),
  Asset = m.model("MediaAsset");
const limits = {
  maxFiles: 12,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 25 * 1024 * 1024,
};
const types = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};
let provider;
function configured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
function client() {
  if (provider) return provider;
  if (!configured())
    fail(503, "DEPENDENCY_UNAVAILABLE", "Image hosting is not configured");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return {
    upload: (buffer, publicId) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: "image",
            overwrite: false,
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
          },
          (err, result) => (err ? reject(err) : resolve(result)),
        );
        stream.end(buffer);
      }),
    destroy: (publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      }),
  };
}
function requireProvider() {
  client();
}
async function ticket(body, owner) {
  requireProvider();
  object(body, ["files"]);
  if (
    !Array.isArray(body.files) ||
    !body.files.length ||
    body.files.length > limits.maxFiles
  )
    fail(422, "INVALID_INPUT", "Choose 1–12 image files");
  let total = 0;
  for (const file of body.files) {
    object(file, ["mimeType", "size"]);
    if (!types[file.mimeType])
      fail(415, "UNSUPPORTED_MEDIA", "JPEG, PNG and WebP only");
    integer(file.size, "size", 1, limits.maxFileBytes);
    total += file.size;
  }
  if (total > limits.maxTotalBytes)
    fail(413, "PAYLOAD_TOO_LARGE", "Images exceed total byte limit");
  const record = await Ticket.create({
    owner,
    files: body.files,
    expiresAt: new Date(Date.now() + 600000),
  });
  return {
    ticketId: record._id,
    uploadUrl: "/admin/uploads?ticketId=" + record._id,
    expiresAt: record.expiresAt,
    limits,
  };
}
async function validate(files, declarations) {
  if (
    !Array.isArray(files) ||
    !files.length ||
    files.length !== declarations.length
  )
    fail(422, "INVALID_INPUT", "Image count differs from ticket");
  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i],
      declared = declarations[i];
    total += file.size;
    if (
      file.size !== declared.size ||
      file.size > limits.maxFileBytes ||
      !types[file.mimetype] ||
      file.mimetype !== declared.mimeType
    )
      fail(415, "UNSUPPORTED_MEDIA", "Image size or declared type mismatch");
    let meta;
    try {
      meta = await sharp(file.buffer, {
        limitInputPixels: 40000000,
        animated: false,
      }).metadata();
      await sharp(file.buffer, { limitInputPixels: 40000000 }).stats();
    } catch {
      fail(415, "UNSUPPORTED_MEDIA", "Invalid image content");
    }
    if (
      meta.format !== types[file.mimetype] ||
      !meta.width ||
      !meta.height ||
      meta.width * meta.height > 40000000 ||
      (meta.pages || 1) > 1
    )
      fail(415, "UNSUPPORTED_MEDIA", "Invalid image content or dimensions");
    file.metadata = meta;
  }
  if (total > limits.maxTotalBytes)
    fail(413, "PAYLOAD_TOO_LARGE", "Images exceed total byte limit");
}
async function upload(ticketId, files, owner) {
  id(ticketId);
  const pending = await Ticket.findOne({
    _id: ticketId,
    owner,
    state: "pending",
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!pending)
    fail(
      409,
      "UPLOAD_TICKET_INVALID",
      "Upload ticket expired, used or belongs to another account",
    );
  await validate(files, pending.files);
  const claim = await Ticket.findOneAndUpdate(
    { _id: ticketId, owner, state: "pending", expiresAt: { $gt: new Date() } },
    { $set: { state: "processing" } },
  );
  if (!claim) fail(409, "UPLOAD_TICKET_INVALID", "Upload ticket already used");
  const assets = [];
  try {
    for (const file of files) {
      const publicId = "mtcards/" + randomUUID();
      let result;
      try {
        result = await client().upload(file.buffer, publicId);
      } catch (err) {
        await Asset.create({ owner, publicId, state: "cleanup" });
        throw err;
      }
      try {
        const url = new URL(result.secure_url);
        if (
          url.protocol !== "https:" ||
          url.hostname !== "res.cloudinary.com" ||
          result.public_id !== publicId
        )
          throw Error("Unexpected provider response");
      } catch (err) {
        await Asset.create({ owner, publicId, state: "cleanup" });
        throw err;
      }
      let asset;
      try {
        asset = await Asset.create({
          owner,
          publicId: result.public_id,
          url: result.secure_url,
          mimeType: file.mimetype,
          bytes: file.size,
          width: file.metadata.width,
          height: file.metadata.height,
          state: "ready",
        });
      } catch (err) {
        try {
          await client().destroy(publicId);
        } catch {
          await Asset.create({ owner, publicId, state: "cleanup" });
        }
        throw err;
      }
      assets.push(asset);
    }
    await Ticket.updateOne({ _id: ticketId }, { $set: { state: "complete" } });
    return assets.map((a) => ({
      id: a._id,
      url: a.url,
      mimeType: a.mimeType,
      bytes: a.bytes,
      width: a.width,
      height: a.height,
    }));
  } catch (err) {
    for (const asset of assets) {
      try {
        const result = await client().destroy(asset.publicId);
        if (!["ok", "not found"].includes(result.result))
          throw Error("Cleanup failed");
        await Asset.deleteOne({ _id: asset._id });
      } catch {
        await Asset.updateOne(
          { _id: asset._id },
          { $set: { state: "cleanup" } },
        );
      }
    }
    await Ticket.updateOne({ _id: ticketId }, { $set: { state: "failed" } });
    fail(
      503,
      "DEPENDENCY_UNAVAILABLE",
      "Image upload failed; cleanup is recorded",
    );
  }
}
async function remove(assetId, owner) {
  id(assetId);
  let asset;
  await m.connection.transaction(async (session) => {
    asset = await Asset.findOne({ _id: assetId, owner }).session(session);
    if (!asset) fail(404, "NOT_FOUND", "Asset not found");
    if (
      asset.cardId ||
      asset.state === "attached" ||
      (await m
        .model("Post")
        .exists({ imageAssetIds: assetId })
        .session(session))
    )
      fail(409, "ASSET_IN_USE", "Detach the image from its card first");
    asset = await Asset.findOneAndUpdate(
      { _id: assetId, owner, state: { $in: ["ready", "cleanup", "deleting"] } },
      { $set: { state: "deleting" } },
      { session, new: true },
    );
    if (!asset) fail(409, "ASSET_IN_USE", "Asset is unavailable");
  });
  try {
    const result = await client().destroy(asset.publicId);
    if (!["ok", "not found"].includes(result.result))
      throw Error("Delete rejected");
    await Asset.deleteOne({ _id: assetId, state: "deleting" });
  } catch {
    fail(
      503,
      "DEPENDENCY_UNAVAILABLE",
      "Provider deletion failed; retry is safe",
    );
  }
  return { success: true };
}
// Explicit injection for isolated provider tests; never driven by HTTP or environment input.
module.exports = {
  limits,
  ticket,
  upload,
  validate,
  remove,
  requireProvider,
  setTestProvider: (value) => {
    provider = value;
  },
};
