const router = require("express").Router();
const m = require("mongoose");
const { fail, id, paging, route } = require("../utils/api");
const cards = require("../services/cards"),
  inquiries = require("../services/inquiries");
const Post = m.model("Post");
router.get(
  "/cards",
  route(async (req, res) => {
    const { page, limit } = paging(req.query),
      filter = cards.filter(req.query, false);
    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);
    res.json({ items: items.map((c) => cards.present(c)), total, page, limit });
  }),
);
router.get(
  "/cards/:id",
  route(async (req, res) => {
    id(req.params.id);
    const card = await Post.findOne({
      _id: req.params.id,
      $or: [{ status: "published" }, { status: { $exists: false } }],
    }).lean();
    if (!card) fail(404, "NOT_FOUND", "Card not found");
    res.json({ card: cards.present(card) });
  }),
);
router.post(
  "/enquiries",
  route(async (req, res) => {
    const result = await inquiries.create(req.body);
    res.status(result.replayed ? 200 : 201).json(result);
  }),
);
module.exports = router;
