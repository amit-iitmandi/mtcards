const { randomUUID } = require("crypto");
class ApiError extends Error {
  constructor(status, code, message, fieldErrors = {}) {
    super(message);
    Object.assign(this, { status, code, fieldErrors });
  }
}
const fail = (status, code, message, fields) => {
  throw new ApiError(status, code, message, fields);
};
function object(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail(422, "INVALID_INPUT", "Expected an object");
  for (const key of Object.keys(body))
    if (!allowed.includes(key))
      fail(422, "INVALID_INPUT", "Unknown field", { [key]: "Not allowed" });
  return body;
}
function text(value, name, max, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(422, "INVALID_INPUT", "Invalid " + name, {
      [name]: "Required text, maximum " + max,
    });
  return value.trim();
}
function integer(value, name, min = 0, max = 10000000) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(422, "INVALID_INPUT", "Invalid " + name, {
      [name]: `Integer ${min}–${max} required`,
    });
  return value;
}
const id = (value) => {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
    fail(422, "INVALID_INPUT", "Invalid identifier");
  return value;
};
function paging(query) {
  const parse = (v, d, max) =>
    v === undefined
      ? d
      : /^[1-9]\d{0,6}$/.test(String(v))
        ? Math.min(Number(v), max)
        : fail(422, "INVALID_INPUT", "Invalid pagination");
  return {
    page: parse(query.page, 1, 100000),
    limit: parse(query.limit, 20, 100),
  };
}
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const route = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
function envelope(req, res, next) {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && typeof body?.error === "string")
      body = {
        ...body,
        code:
          body.code ||
          {
            400: "BAD_JSON",
            401: "UNAUTHENTICATED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "VERSION_CONFLICT",
            413: "PAYLOAD_TOO_LARGE",
            415: "UNSUPPORTED_MEDIA",
            422: "INVALID_INPUT",
            429: "RATE_LIMITED",
            503: "DEPENDENCY_UNAVAILABLE",
          }[res.statusCode] ||
          "INTERNAL_ERROR",
        requestId: req.requestId,
        fieldErrors: body.fieldErrors || {},
      };
    return json(body);
  };
  next();
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500,
    code = err.code;
  if (err.name === "MulterError") {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 422;
    code = status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_INPUT";
  }
  if (err.name === "ValidationError") {
    status = 422;
    code = "INVALID_INPUT";
  }
  if (err.code === 11000) {
    status = 409;
    code = "VERSION_CONFLICT";
  }
  return res
    .status(status)
    .json({
      error:
        status >= 500
          ? "Service unavailable"
          : err instanceof ApiError
            ? err.message
            : status === 413
              ? "Request too large"
              : "Invalid request",
      code:
        typeof code === "string"
          ? code
          : status >= 500
            ? "DEPENDENCY_UNAVAILABLE"
            : "INVALID_INPUT",
      fieldErrors: err.fieldErrors || {},
    });
}
module.exports = {
  ApiError,
  fail,
  object,
  text,
  integer,
  id,
  paging,
  literal,
  route,
  envelope,
  errorHandler,
};
