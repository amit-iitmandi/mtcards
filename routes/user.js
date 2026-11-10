const express = require("express");
const router = express.Router();
const requireLogin = require("../middleware/requireLogin");

router.get("/user/:id", requireLogin, (req, res) => {
  if (String(req.user._id) !== req.params.id) return res.status(403).json({ error: "Access denied" });
  const { _id, name, email, date } = req.user;
  return res.json({ _id, name, email, date });
});
module.exports = router;
