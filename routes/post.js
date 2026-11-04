const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const requireAdmin = require("../middleware/requireAdmin");
const validatePost = require("../utils/validatePost");
const Post = mongoose.model("Post");

router.post("/createPost", requireAdmin, async (req, res) => {
  return res.status(409).json({error:"Use signed uploads and POST /admin/cards",code:"SIGNED_UPLOAD_REQUIRED"});
});

router.get("/allPost", async (req, res) => {
  try {
    const posts = await Post.find({status:{$ne:"archived"}}).sort({ title: 1 });
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
    const existing = await Post.findById(req.params.postId).lean();
    if (!existing) return res.status(404).json({error:"Product not found"});
    await require('../services/cards').update(req.params.postId,{expectedVersion:existing.version||0,status:'archived'},req.user._id);
    return res.json({success:true,archived:true});
  } catch (err) {
    return res.status(500).json({ error: "Could not delete product" });
  }
});
module.exports = router;
