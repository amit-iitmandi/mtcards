import { vi } from 'vitest';
import axios from 'axios';
import { endSession } from './session';
vi.mock('axios');
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); sessionStorage.setItem('token', JSON.stringify({ data: { token: 'Bearer fixture' } })); });
test('logout waits for server revocation before removing the token and private drafts', async () => {
  let finish;
  axios.post.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  sessionStorage.setItem('mtcards:card-draft:1', 'private draft');
  const pending = endSession();
  expect(sessionStorage.getItem('token')).not.toBeNull();
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/logout'), {}, { headers: { Authorization: 'Bearer fixture' }, timeout: 15000 });
  finish({ data: { success: true } }); await pending;
  expect(sessionStorage.getItem('token')).toBeNull();
  expect(sessionStorage.getItem('mtcards:card-draft:1')).toBeNull();
});
test('network failure preserves the token for a retry and never claims revocation', async () => {
  axios.post.mockRejectedValue(new Error('offline'));
  await expect(endSession()).rejects.toThrow('Could not revoke');
  expect(sessionStorage.getItem('token')).not.toBeNull();
});
test('already expired token can be cleared', async () => {
  axios.post.mockRejectedValue({ response: { status: 401 } });
  await endSession(); expect(sessionStorage.getItem('token')).toBeNull();
});
test('API URL builder refuses credentials and insecure remote origins', async () => {
  const { apiUrl } = await import('./api');
  const previous = process.env.REACT_APP_API_BASE_URL;
  try {
    process.env.REACT_APP_API_BASE_URL = 'http://remote.example';
    expect(() => apiUrl('/logout')).toThrow('secure API');
    process.env.REACT_APP_API_BASE_URL = 'https://user:password@example.com';
    expect(() => apiUrl('/logout')).toThrow('secure API');
  } finally {
    if (previous === undefined) delete process.env.REACT_APP_API_BASE_URL;
    else process.env.REACT_APP_API_BASE_URL = previous;
  }
});

test('HTML or malformed success cannot masquerade as a revoked session', async () => {
  axios.post.mockResolvedValue({ data: '<html>frontend fallback</html>' });
  await expect(endSession()).rejects.toThrow('Could not revoke');
  expect(sessionStorage.getItem('token')).not.toBeNull();
});
