const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const requireAdmin = require("../middleware/requireAdmin");
const validatePost = require("../utils/validatePost");
const Post = mongoose.model("Post");

router.post("/createPost", requireAdmin, async (req, res) => {
  const fields = validatePost(req.body);
  if (!fields) return res.status(400).json({ error: "Invalid product data" });
  try {
    const post = await new Post(fields).save();
    return res.status(201).json({ post });
  } catch (err) {
    return res.status(500).json({ error: "Could not save product" });
  }
});

router.get("/allPost", async (req, res) => {
  try {
    const posts = await Post.find().sort({ title: 1 });
    return res.json(posts);
  } catch (err) {
    return res.status(500).json({ error: "Could not load products" });
  }
});

router.get("/myPost", requireLogin, async (req, res) => {
  try {
    const posts = await Post.find({ postedBy: req.user._id });
    return res.json(posts);
  } catch (err) {
    return res.status(500).json({ error: "Could not load products" });
  }
});

// Deliberately disable the dangerous mass-delete endpoint.
router.delete("/allPost", (req, res) => res.status(405).json({ error: "Mass deletion disabled" }));

router.delete("/deletePost/:postId", requireAdmin, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ error: "Product not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Could not delete product" });
  }
});
module.exports = router;
