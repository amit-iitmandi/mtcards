const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { JWT_SECRET } = require("../config/keys");

router.get("/register", (req, res) => {
  User.find().then((usr) => res.json(usr));
});

router.post("/register", (req, res) => {
  User.findOne({ email: req.body.userEmail })
    .then((user) => {
      if (user) {
        return res.status(400).json({ email: "Email already exists" });
      }

      const newUser = new User({
        name: req.body.userName,
        email: req.body.userEmail,
        password: req.body.userPass,
      });

      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          return res.status(500).json({ error: "Unable to hash password" });
        }

        bcrypt.hash(newUser.password, salt, (error, hash) => {
          if (error) {
            return res.status(500).json({ error: "Unable to hash password" });
          }

          newUser.password = hash;
          newUser
            .save()
            .then(() => {
              res.status(201).json({ success: true, message: "User registered successfully" });
            })
            .catch((saveError) => {
              console.log(saveError);
              res.status(500).json({ error: "Unable to save user" });
            });
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Unable to register user" });
    });
});

router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.userPass;

  User.findOne({ email }).then((user) => {
    if (!user) {
      console.log("Email not found");
      return res.status(404).json({ emailnotfound: "Email not found" });
    }

    bcrypt
      .compare(password, user.password)
      .then((isMatch) => {
        if (isMatch) {
          const payload = {
            id: user._id,
            name: user.name,
          };

          const secret = JWT_SECRET || process.env.SECRET_OR_KEY || process.env.JWT_SECRET;

          jwt.sign(
            payload,
            secret,
            { expiresIn: 31556926 },
            (err, token) => {
              if (err) {
                console.log(err);
                return res.status(500).json({ error: "Unable to generate token" });
              }

              res.json({
                success: true,
                token: "Bearer " + token,
              });
            }
          );
        } else {
          return res.status(400).json({ passwordincorrect: "Password incorrect" });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Unable to authenticate user" });
      });
  });
});

module.exports = router;
