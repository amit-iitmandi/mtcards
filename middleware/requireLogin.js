const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!process.env.SECRET_OR_KEY) {
    return res.status(503).json({ error: "Authentication unavailable" });
  }
  try {
    const payload = jwt.verify(authorization.slice(7), process.env.SECRET_OR_KEY, { algorithms: ["HS256"] });
    if (!payload || !payload.id || !mongoose.Types.ObjectId.isValid(payload.id)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const user = await User.findById(payload.id);
    if (user && (payload.sv || 0) !== (user.sessionVersion || 0)) return res.status(401).json({ error: "Session expired" });
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
