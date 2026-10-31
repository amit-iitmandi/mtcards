if (process.env.NODE_ENV === "production") {
  module.exports = require("./prod");
} else {
  module.exports = {
    MONGOURI: process.env.MONGOURI || process.env.DATABASE_ACCESS,
    JWT_SECRET: process.env.SECRET_OR_KEY || process.env.JWT_SECRET,
  };
}
