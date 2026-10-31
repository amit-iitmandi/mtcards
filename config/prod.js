module.exports = {
  MONGOURI: process.env.MONGOURI || process.env.DATABASE_ACCESS,
  JWT_SECRET: process.env.SECRET_OR_KEY || process.env.JWT_SECRET,
  SENDGRID_API: process.env.SENDGRID_API,
  EMAIL: process.env.EMAIL,
};
