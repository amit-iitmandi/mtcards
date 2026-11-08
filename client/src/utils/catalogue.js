import axios from 'axios';
import { apiUrl } from './api';

// Fetch explicit public/admin projections. The old full-record route is retired.
export async function loadCards({ admin = false, token } = {}) {
  const items = [];
  let page = 1;
  while (page <= 100) {
    const { data } = await axios.get(apiUrl(`${admin ? '/admin/cards' : '/cards'}?page=${page}&limit=100`), {
      timeout: 15000,
      ...(admin ? { headers: { Authorization: token } } : {})
    });
    if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0) {
      throw new Error('Invalid catalogue response');
    }
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) return items;
    page++;
  }
  throw new Error('Catalogue is too large; refine the search');
}
