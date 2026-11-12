import axios from 'axios';
import { apiUrl } from './api';

const firstPageUrl = () => apiUrl('/cards?page=1&limit=100');
let startupPage;

function isCataloguePage(data) {
  return data && Array.isArray(data.items) && Number.isSafeInteger(data.total) && data.total >= 0;
}

async function fetchStartupPage(url) {
  const deadline = Date.now() + 80000;
  while (Date.now() < deadline) {
    try {
      const { data } = await axios.get(url, { timeout: Math.min(15000, deadline - Date.now()) });
      if (isCataloguePage(data)) return data;
      // Render can serve an HTML loading page while the API is starting.
      if (typeof data !== 'string' || !/^\s*</.test(data)) throw new Error('Invalid catalogue response');
    } catch (error) {
      if (!['ECONNABORTED', 'ETIMEDOUT'].includes(error.code) &&
          ![502, 503, 504].includes(error.response?.status)) throw error;
    }
    const delay = Math.min(3000, deadline - Date.now());
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Catalogue startup timed out');
}

export function warmCatalogue() {
  const url = firstPageUrl();
  // Local development and same-origin deployments use their normal request flow.
  if (!url.startsWith('https://') || !new URL(url).hostname.endsWith('.onrender.com')) return;
  if (startupPage) return startupPage;
  startupPage = fetchStartupPage(url);
  const clear = () => { startupPage = undefined; };
  startupPage.then(clear, clear);
  return startupPage;
}

export function waitForCatalogueStartup() {
  // A failed public read must not prevent a subsequent login or session check.
  return startupPage?.catch(() => {});
}

// Fetch explicit public/admin projections. The old full-record route is retired.
export async function loadCards({ admin = false, token } = {}) {
  const items = [];
  let page = 1;
  while (page <= 100) {
    const data = !admin && page === 1 && startupPage ? await startupPage : (await axios.get(apiUrl(`${admin ? '/admin/cards' : '/cards'}?page=${page}&limit=100`), {
      timeout: 15000,
      ...(admin ? { headers: { Authorization: token } } : {})
    })).data;
    if (!isCataloguePage(data)) {
      throw new Error('Invalid catalogue response');
    }
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) return items;
    page++;
  }
  throw new Error('Catalogue is too large; refine the search');
}
