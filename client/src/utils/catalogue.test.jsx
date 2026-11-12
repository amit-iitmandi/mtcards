import { vi } from 'vitest';
import axios from 'axios';
import { loadCards } from './catalogue';
vi.mock('axios');
beforeEach(() => vi.resetAllMocks());
test('public catalogue follows pages without forwarding administrator credentials', async () => {
  axios.get.mockResolvedValueOnce({ data: { items: [{ _id: 'one' }], total: 2 } }).mockResolvedValueOnce({ data: { items: [{ _id: 'two' }], total: 2 } });
  expect(await loadCards()).toHaveLength(2);
  expect(axios.get.mock.calls[0][0]).toContain('/cards?page=1');
  expect(axios.get.mock.calls[1][0]).toContain('/cards?page=2');
  for (const [, config] of axios.get.mock.calls) expect(config.headers).toBeUndefined();
});
test('management list uses the authenticated administrator projection', async () => {
  axios.get.mockResolvedValue({ data: { items: [], total: 0 } });
  await loadCards({ admin: true, token: 'Bearer fixture' });
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/admin/cards?'), { timeout: 15000, headers: { Authorization: 'Bearer fixture' } });
});

test('the first catalogue load shares the startup request and waits through a Render loading page', async () => {
  vi.stubEnv('REACT_APP_API_BASE_URL', 'https://example.onrender.com');
  vi.useFakeTimers();
  try {
    const { warmCatalogue } = await import('./catalogue');
    axios.get.mockResolvedValueOnce({ data: '<html>Starting</html>' })
      .mockResolvedValueOnce({ data: { items: [{ _id: 'one' }], total: 1 } });
    const startup = warmCatalogue();
    const catalogue = loadCards();
    expect(axios.get).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    await startup;
    expect(await catalogue).toEqual([{ _id: 'one' }]);
    expect(axios.get).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  }
});
