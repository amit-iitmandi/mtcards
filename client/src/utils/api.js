// Public API origin only; credentials must never be included here.
export function apiUrl(path) {
  const base = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
