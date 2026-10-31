const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    console.log("you must be logged in");
    return res.status(401).json({ error: "you must be logged in" });
  }

  const token = authorization.replace("Bearer ", "");
  const secret = JWT_SECRET || process.env.SECRET_OR_KEY || process.env.JWT_SECRET;

  jwt.verify(token, secret, (err, payload) => {
    if (err) {
      console.log("you must be logged in");
      return res.status(401).json({ error: "you must be logged in" });
    }

    const { id } = payload;

    User.findById(id).then((userdata) => {
      if (!userdata) {
        return res.status(401).json({ error: "you must be logged in" });
      }

      req.user = userdata;
      next();
    }).catch(() => {
      res.status(401).json({ error: "you must be logged in" });
    });
  });
};
