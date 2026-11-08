// Public API origin only; credentials must never be included here.
export function apiUrl(path) {
  const base = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
  if (base) {
    const url = new URL(base);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) {
      throw new Error('Configure a secure API URL without credentials');
    }
  }
  return `${base}/${path.replace(/^\/+/, '')}`;
}
