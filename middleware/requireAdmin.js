const requireLogin = require("./requireLogin");

function requireAdmin(req, res, next) {
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!req.user || !allowed.length ||
      !allowed.includes(String(req.user.email || "").toLowerCase())) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = [requireLogin, requireAdmin];
