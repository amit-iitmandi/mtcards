const router = require("express").Router();
const { createHash } = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("mongoose").model("User");
const requireAdmin = require("../middleware/requireAdmin");

router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/admin/session", requireAdmin, (req, res) => {
  return res.json({ email: req.user.email, name: req.user.name });
});

// Only a privately provisioned, unexpired invitation can set the first password.
router.post("/admin/setup", async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(token) ||
      typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "Use a valid setup code and a password of at least 12 characters (up to 72 UTF-8 bytes)" });
  }
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return res.status(403).json({ error: "Setup unavailable" });
  try {
    const setupTokenHash = createHash("sha256").update(token).digest("hex");
    const hash = await bcrypt.hash(password, 12);
    // Atomic consume prevents concurrent requests or replay from replacing the password.
    const user = await User.findOneAndUpdate(
      { setupTokenHash, setupExpiresAt: { $gt: Date.now() }, email: { $in: allowed } },
      { $set: { password: hash }, $unset: { setupTokenHash: "", setupExpiresAt: "" } },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(400).json({ error: "Setup code is invalid, expired or already used" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(503).json({ error: "Setup unavailable" });
  }
});
module.exports = router;
