const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");

router.get("/register", (req, res) => {
  return res.status(410).json({ error: "User directory is unavailable" });
});

router.post("/register", (req, res) => {
  // console.log(req);
  User.findOne({ email: req.body.userEmail }).then((user) => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const newUser = new User({
        name: req.body.userName,
        email: req.body.userEmail,
        password: req.body.userPass,
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser.save();
        });
      });
    }
  });
});

router.post("/login", (req, res) => {
  if (!process.env.SECRET_OR_KEY) {
    return res.status(503).json({ error: "Authentication unavailable" });
  }
  const email = req.body.email;
  const password = req.body.userPass;
  // console.log(req);
  // Find user by email
  User.findOne({ email }).then((user) => {
    // Check if user exists

    if (!user) {
      console.log("Email not found");
      return res.status(404).json({ emailnotfound: "Email not found" });
    }
    // Check password
    bcrypt
      .compare(password, user.password)
      .then((isMatch) => {
        if (isMatch) {
          console.log("Pass matched");
          // User matched
          // Create JWT Payload
          const payload = {
            id: user._id,
            name: user.name,
          };
          // Sign token
          jwt.sign(
            payload,
            process.env.SECRET_OR_KEY,
            {
              expiresIn: 31556926, // 1 year in seconds
            },
            (err, token) => {
              if (err) return res.status(503).json({ error: "Authentication unavailable" });
              res.json({
                success: true,
                token: "Bearer " + token,
              });

              // path = token;
            }
          );
        } else {
          return res
            .status(400)
            .json({ passwordincorrect: "Password incorrect" });
        }
      })
      .catch((err) => console.log(err));
  });
});

module.exports = router;
