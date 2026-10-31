const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 8000;

dotenv.config();

const { MONGOURI } = require("./config/keys");

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

const mongoURI = MONGOURI || process.env.MONGOURI || process.env.DATABASE_ACCESS;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Database connection error:", err));

require("./models/user");
require("./models/post");

app.use(express.json());
app.use(cors());

app.use(require("./routes/auth"));
app.use(require("./routes/user"));
app.use(require("./routes/post"));

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  const path = require("path");
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

app.listen(PORT, () => console.log("Listening on " + PORT));
