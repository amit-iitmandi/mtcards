const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Post = mongoose.model("Post");

router.post("/createPost", requireLogin, (req, res) => {
  const { stock, image, title, description, cPrice, sPrice, type1, type2 } = req.body;

  const post = new Post({
    title,
    stock,
    description,
    cPrice,
    sPrice,
    image,
    type1,
    type2,
    postedBy: req.user._id,
  });

  post
    .save()
    .then((result) => {
      res.json({ post: result });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Unable to create post" });
    });
});

var mysort = { title: 1 };

router.get("/allPost", (req, res) => {
  Post.find().sort(mysort).then((posts) => {
    res.json(posts);
  });
});

router.get("/myPost", requireLogin, (req, res) => {
  Post.find({ postedBy: req.user._id })
    .sort(mysort)
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Unable to fetch posts" });
    });
});

router.delete("/deletePost/:postId", requireLogin, (req, res) => {
  Post.findOne({ _id: req.params.postId, postedBy: req.user._id })
    .then((post) => {
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      post
        .remove()
        .then(() => {
          res.json({ message: "Post deleted successfully" });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: "Unable to delete post" });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Unable to delete post" });
    });
});

module.exports = router;
