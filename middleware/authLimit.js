// Bounded process-local abuse protection. Proxy headers are deliberately ignored.
module.exports = function authLimit({ limit = 30, windowMs = 15 * 60 * 1000, maxKeys = 10000, now = Date.now } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    if (req.method !== "POST") return next();
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.reset <= time) buckets.delete(key);
    const key = req.socket.remoteAddress;
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxKeys) return res.status(429).json({ error: "Try again later" });
      bucket = { count: 0, reset: time + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) {
      res.set("Retry-After", String(Math.ceil((bucket.reset - time) / 1000)));
      return res.status(429).json({ error: "Try again later" });
    }
    return next();
  };
};
