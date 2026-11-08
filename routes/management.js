const router = require("express").Router();
const m = require("mongoose");
const multer = require("multer");
const {
  fail,
  object,
  text,
  integer,
  id,
  paging,
  literal,
  route,
} = require("../utils/api");
const requireAdmin = require("../middleware/requireAdmin");
const cards = require("../services/cards"),
  stock = require("../services/inventory"),
  media = require("../services/media"),
  inquiries = require("../services/inquiries");
const Post = m.model("Post"),
  Inventory = m.model("Inventory"),
  Movement = m.model("StockMovement"),
  Inquiry = m.model("Inquiry");
router.use(requireAdmin);
router.get(
  "/cards",
  route(async (req, res) => {
    const { page, limit } = paging(req.query),
      filter = cards.filter(req.query, true);
    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);
    res.json({
      items: items.map((c) => cards.present(c, true)),
      total,
      page,
      limit,
    });
  }),
);
router.get(
  "/cards/:id",
  route(async (req, res) => {
    id(req.params.id);
    const card = await Post.findById(req.params.id).lean();
    if (!card) fail(404, "NOT_FOUND", "Card not found");
    res.json({ card: cards.present(card, true) });
  }),
);
router.post(
  "/cards",
  route(async (req, res) =>
    res.status(201).json({ card: await cards.create(req.body, req.user._id) }),
  ),
);
router.patch(
  "/cards/:id",
  route(async (req, res) =>
    res.json({
      card: await cards.update(req.params.id, req.body, req.user._id),
    }),
  ),
);
router.delete(
  "/cards/:id",
  route(async (req, res) => {
    object(req.body, ["expectedVersion"]);
    res.json({
      card: await cards.update(
        req.params.id,
        { expectedVersion: req.body.expectedVersion, status: "archived" },
        req.user._id,
      ),
    });
  }),
);
router.get(
  "/inventory",
  route(async (req, res) => {
    const { page, limit } = paging(req.query);
    const filter = cards.filter({ ...req.query, status: undefined }, true);
    const stockFilter = {};
    if (req.query.stock) {
      if (!["low", "out", "available", "unknown"].includes(req.query.stock))
        fail(422, "INVALID_INPUT", "Invalid stock filter");
      if (req.query.stock === "unknown")
        stockFilter["inventory.0"] = { $exists: false };
      else {
        stockFilter["inventory.0"] = { $exists: true };
        const available = {
          $subtract: [
            { $arrayElemAt: ["$inventory.onHand", 0] },
            { $arrayElemAt: ["$inventory.reserved", 0] },
          ],
        };
        stockFilter.$expr =
          req.query.stock === "out"
            ? { $eq: [available, 0] }
            : req.query.stock === "available"
              ? { $gt: [available, 0] }
              : {
                  $and: [
                    { $gt: [available, 0] },
                    {
                      $lte: [
                        available,
                        { $arrayElemAt: ["$inventory.lowStockThreshold", 0] },
                      ],
                    },
                  ],
                };
      }
    }
    const result = await Post.aggregate([
      { $match: filter },
      { $sort: { _id: 1 } },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "_id",
          as: "inventory",
        },
      },
      { $match: stockFilter },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ]);
    res.json({
      items: result[0].items.map((c) => ({
        ...stock.snapshot(c.inventory[0], c._id),
        title: c.title,
        status: c.status || "published",
        legacyStock: c.stock ?? null,
      })),
      total: result[0].total[0]?.count || 0,
      page,
      limit,
    });
  }),
);
router.post(
  "/inventory/:id/initialize",
  route(async (req, res) =>
    res
      .status(201)
      .json(await stock.initialize(req.params.id, req.body, req.user._id)),
  ),
);
router.post(
  "/inventory/:id/adjustments",
  route(async (req, res) => {
    const result = await stock.adjust(req.params.id, req.body, req.user._id);
    res.status(result.replayed ? 200 : 201).json(result);
  }),
);
router.get(
  "/inventory/:id/movements",
  route(async (req, res) => {
    id(req.params.id);
    if (!(await Post.exists({ _id: req.params.id })))
      fail(404, "NOT_FOUND", "Card not found");
    const { page, limit } = paging(req.query),
      filter = { cardId: req.params.id };
    const [items, total] = await Promise.all([
      Movement.find(filter)
        .select("-fingerprint -result")
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Movement.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  }),
);
router.patch(
  "/inventory/:id",
  route(async (req, res) => {
    id(req.params.id);
    object(req.body, ["expectedVersion", "lowStockThreshold"]);
    const expectedVersion = integer(
        req.body.expectedVersion,
        "expectedVersion",
      ),
      lowStockThreshold = integer(
        req.body.lowStockThreshold,
        "lowStockThreshold",
      );
    const record = await m.connection.transaction(async (session) => {
      const result = await Inventory.findOneAndUpdate(
        { _id: req.params.id, version: expectedVersion },
        { $set: { lowStockThreshold }, $inc: { version: 1 } },
        { new: true, session, runValidators: true },
      );
      if (!result)
        fail(
          409,
          "VERSION_CONFLICT",
          "Inventory changed or is not initialized",
        );
      await m
        .model("AuditEvent")
        .create(
          [
            {
              actor: req.user._id,
              cardId: req.params.id,
              action: "inventory.threshold",
              version: result.version,
              details: { lowStockThreshold },
            },
          ],
          { session },
        );
      return result;
    });
    res.json({ inventory: stock.snapshot(record) });
  }),
);
router.post(
  "/uploads/sign",
  route(async (req, res) =>
    res.status(201).json(await media.ticket(req.body, req.user._id)),
  ),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 12, fileSize: 5 * 1024 * 1024, fields: 0, parts: 12 },
}).array("files", 12);
router.post(
  "/uploads",
  (req, res, next) => {
    try {
      media.requireProvider();
      next();
    } catch (err) {
      next(err);
    }
  },
  upload,
  route(async (req, res) =>
    res
      .status(201)
      .json({
        assets: await media.upload(req.query.ticketId, req.files, req.user._id),
      }),
  ),
);
router.delete(
  "/uploads/:id",
  route(async (req, res) =>
    res.json(await media.remove(req.params.id, req.user._id)),
  ),
);
router.get(
  "/summary",
  route(async (req, res) => {
    const [designs, totals, inquiryTotals] = await Promise.all([
      Post.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$status", "published"] },
            count: { $sum: 1 },
          },
        },
      ]),
      Post.aggregate([
        { $match: { status: { $ne: "archived" } } },
        {
          $lookup: {
            from: "inventories",
            localField: "_id",
            foreignField: "_id",
            as: "inv",
          },
        },
        { $unwind: { path: "$inv", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            initialized: {
              $sum: {
                $cond: [{ $eq: [{ $type: "$inv.onHand" }, "missing"] }, 0, 1],
              },
            },
            onHand: { $sum: "$inv.onHand" },
            reserved: { $sum: "$inv.reserved" },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $gt: [
                          { $subtract: ["$inv.onHand", "$inv.reserved"] },
                          0,
                        ],
                      },
                      {
                        $lte: [
                          { $subtract: ["$inv.onHand", "$inv.reserved"] },
                          "$inv.lowStockThreshold",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStock: {
              $sum: {
                $cond: [
                  { $eq: [{ $subtract: ["$inv.onHand", "$inv.reserved"] }, 0] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const d = { total: 0, published: 0, draft: 0, archived: 0 };
    for (const row of designs) {
      d[row._id] = row.count;
      d.total += row.count;
    }
    const t = totals[0] || {
      total: 0,
      initialized: 0,
      onHand: 0,
      reserved: 0,
      lowStock: 0,
      outOfStock: 0,
    };
    res.json({
      designs: d,
      inventory: {
        unit: "set",
        initializedCards: t.initialized,
        uninitializedCards: t.total - t.initialized,
        onHand: t.onHand,
        reserved: t.reserved,
        available: t.onHand - t.reserved,
        lowStockCards: t.lowStock,
        outOfStockCards: t.outOfStock,
      },
      inquiries: {
        new: inquiryTotals.find((i) => i._id === "new")?.count || 0,
        total: inquiryTotals.reduce((sum, i) => sum + i.count, 0),
      },
    });
  }),
);
router.get(
  "/enquiries",
  route(async (req, res) => {
    const { page, limit } = paging(req.query),
      filter = {};
    if (req.query.status) {
      if (
        !["new", "contacted", "quoted", "closed", "spam"].includes(
          req.query.status,
        )
      )
        fail(422, "INVALID_INPUT", "Invalid inquiry status");
      filter.status = req.query.status;
    }
    if (req.query.q) {
      const q = literal(text(req.query.q, "q", 120));
      filter.$or = [
        { customerName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q } },
      ];
    }
    const [items, total] = await Promise.all([
      Inquiry.find(filter)
        .select("-fingerprint")
        .sort({ createdAt: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  }),
);
router.patch(
  "/enquiries/:id",
  route(async (req, res) => {
    if (!/^[a-f\d]{64}$/.test(req.params.id))
      fail(422, "INVALID_INPUT", "Invalid inquiry identifier");
    object(req.body, ["expectedVersion", "status", "notes"]);
    const version = integer(req.body.expectedVersion, "expectedVersion");
    if (
      !["new", "contacted", "quoted", "closed", "spam"].includes(
        req.body.status,
      )
    )
      fail(422, "INVALID_INPUT", "Invalid inquiry status");
    const changes = { status: req.body.status };
    if (req.body.notes !== undefined)
      changes.notes =
        req.body.notes === "" ? "" : text(req.body.notes, "notes", 2000);
    const record = await m.connection.transaction(async (session) => {
      const result = await Inquiry.findOneAndUpdate(
        { _id: req.params.id, version },
        { $set: changes, $inc: { version: 1 } },
        { new: true, session },
      )
        .select("-fingerprint")
        .lean();
      if (!result)
        fail(409, "VERSION_CONFLICT", "Inquiry changed or does not exist");
      await m
        .model("AuditEvent")
        .create(
          [
            {
              actor: req.user._id,
              action: "inquiry.update",
              version: result.version,
              details: { inquiryId: result._id, status: result.status },
            },
          ],
          { session },
        );
      return result;
    });
    res.json({ inquiry: record });
  }),
);
router.post(
  "/enquiries/:id/notification",
  route(async (req, res) => {
    if (!/^[a-f\d]{64}$/.test(req.params.id))
      fail(422, "INVALID_INPUT", "Invalid inquiry identifier");
    const record = await Inquiry.findById(req.params.id);
    if (!record) fail(404, "NOT_FOUND", "Inquiry not found");
    res.json({ notification: await inquiries.notify(record) });
  }),
);
module.exports = router;
