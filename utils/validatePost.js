function validatePost(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;
  const title = text(body.title, 120);
  const type1 = text(body.type1, 100);
  const type2 = text(body.type2, 100);
  const cPrice = text(body.cPrice, 40);
  const sPrice = text(body.sPrice, 40);
  const description = body.description == null || body.description === "" ? "" : text(body.description, 3000);
  const stock = Number(body.stock);
  const image = Array.isArray(body.image) && body.image.length > 0 && body.image.length <= 12 &&
    body.image.every((url) => {
      if (typeof url !== "string" || url.length > 2048) return false;
      try { const parsed = new URL(url); return parsed.protocol === "https:"; } catch { return false; }
    }) ? body.image : null;
  if (!title || !type1 || !type2 || !cPrice || !sPrice || description === null ||
      !Number.isSafeInteger(stock) || stock < 0 || stock > 10000000 || !image) return null;
  return { title, type1, type2, cPrice, sPrice, description, stock, image };
}
module.exports = validatePost;
