const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");

const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= 72;

router.get("/register", (req, res) => res.status(410).json({ error: "User directory is unavailable" }));

// Keep public signup off by default. Existing accounts can still log in.
router.post("/register", async (req, res) => {
  if (process.env.ALLOW_REGISTRATION !== "true") return res.status(403).json({ error: "Registration unavailable" });
  const { userEmail, userName, userPass } = req.body || {};
  if (!validEmail(userEmail) || typeof userName !== "string" || !userName.trim() || userName.length > 120 || !validPassword(userPass) || userPass.length < 8) {
    return res.status(400).json({ error: "Invalid registration details" });
  }
  try {
    if (await User.findOne({ email: userEmail })) return res.status(400).json({ error: "Registration unavailable" });
    const password = await bcrypt.hash(userPass, 10);
    await new User({ name: userName.trim(), email: userEmail, password }).save();
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(503).json({ error: "Registration unavailable" });
  }
});

router.post("/login", async (req, res) => {
  if (!process.env.SECRET_OR_KEY) return res.status(503).json({ error: "Authentication unavailable" });
  const { email, userPass } = req.body || {};
  if (!validEmail(email) || !validPassword(userPass)) return res.status(400).json({ error: "Invalid login details" });
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(userPass, user.password))) return res.status(401).json({ error: "Invalid email or password" });
    jwt.sign({ id: user._id, name: user.name, sv: user.sessionVersion || 0 }, process.env.SECRET_OR_KEY, { algorithm: "HS256", expiresIn: "8h" }, (err, token) => {
      if (err) return res.status(503).json({ error: "Authentication unavailable" });
      return res.json({ success: true, token: "Bearer " + token });
    });
  } catch (err) {
    return res.status(503).json({ error: "Authentication unavailable" });
  }
});

const requireLogin = require('../middleware/requireLogin');
router.get('/me', requireLogin, (req,res) => {
  const allowed=(process.env.ADMIN_EMAILS||'').split(',').map(value=>value.trim().toLowerCase());
  res.json({user:{id:req.user._id,name:req.user.name,email:req.user.email,isAdmin:allowed.includes(String(req.user.email).toLowerCase())}});
});
router.post('/logout', requireLogin, async (req,res,next) => {
  try { await User.updateOne({_id:req.user._id},{$inc:{sessionVersion:1}});res.json({success:true}); }
  catch(err){next(err);}
});
module.exports = router;
