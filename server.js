const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Production secrets are supplied by the hosting environment, never a repo file.
if (process.env.NODE_ENV !== "production") require("dotenv").config();

function createApp({ database = mongoose, env = process.env, mountRoutes = true } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req,res,next)=>{res.on('finish',()=>{if(process.env.NODE_ENV==='production'&&res.statusCode>=500)console.error(JSON.stringify({event:'request.failed',requestId:req.requestId||null,status:res.statusCode,route:req.route?.path||'unmatched'}));});next();});
  app.use((req, res, next) => {
    res.set({"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"});
    if (/^\/(cards|enquiries|me|logout)(\/|$)|^\/admin\/(cards|inventory|uploads|summary|enquiries)(\/|$)/.test(req.path)) return require('./utils/api').envelope(req,res,next);
    next();
  });
  const origins = (env.CORS_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || origins.includes(origin)) }));
  app.use(["/login","/register","/admin/setup"],require("./middleware/authLimit")());
  app.use('/enquiries',require('./middleware/authLimit')({limit:10}));
  app.use('/admin/uploads',require('./middleware/authLimit')({limit:20}));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(express.json({ limit: "100kb" }));
  app.get("/healthz", (req, res) => {
    const ready = database.connection.readyState === 1;
    res.set("Cache-Control", "no-store");
    return res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
  });
  app.use((req, res, next) => {
    if (database.connection.readyState !== 1) return res.status(503).json({ error: "Database unavailable" });
    next();
  });
  if (mountRoutes) {
    require("./models/user");
    require("./models/post");
    require("./models/operations");
    app.use(require("./routes/auth"));
    app.use(require("./routes/admin"));
    app.use(require("./routes/catalogue"));
    app.use("/admin", require("./routes/management"));
    app.use(require("./routes/user"));
    app.use(require("./routes/post"));
  }
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err, req, res, next) => {
    if (req.requestId) return require("./utils/api").errorHandler(err,req,res,next);
    if (res.headersSent) return next(err);
    const status = err.status === 413 ? 413 : err.status === 400 ? 400 : 500;
    return res.status(status).json({ error: status === 413 ? "Request too large" : status === 400 ? "Invalid request" : "Request failed" });
  });
  return app;
}

async function startServer({ database = mongoose, env = process.env, appFactory = createApp } = {}) {
  const uri = env.DATABASE_ACCESS || env.MONGOURI;
  if (!uri) throw new Error("Configure DATABASE_ACCESS for the existing MongoDB database");
  if (!env.SECRET_OR_KEY) throw new Error("Configure SECRET_OR_KEY");
  const port = Number(env.PORT || 8000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid PORT");
  database.set("bufferCommands", false);
  await database.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false
  });
  const app = appFactory({ database, env });
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, "0.0.0.0", () => resolve(listener));
    listener.once("error", reject);
  });
  return server;
}

if (require.main === module) {
  startServer().then(server => {
    console.log("Backend ready on port " + server.address().port);
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      const timeout = setTimeout(() => process.exit(1), 10000);
      timeout.unref();
      server.close(() => mongoose.disconnect().then(() => process.exit(0), () => process.exit(1)));
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }).catch(() => {
    console.error("Backend startup failed. Check database access and required environment variables.");
    process.exit(1);
  });
}

module.exports = { createApp, startServer };
