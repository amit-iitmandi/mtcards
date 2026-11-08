import axios from 'axios';
import { apiUrl } from './api';
import { adminToken } from './uploadPhotos';

export async function endSession() {
  const token = adminToken();
  if (token) {
    try {
      const { data } = await axios.post(apiUrl('/logout'), {}, { headers: { Authorization: token }, timeout: 15000 });
      if (data?.success !== true) throw new Error('Invalid logout response');
    } catch (error) {
      // A rejected/expired token is already unusable. A network failure is not a logout.
      if (error?.response?.status !== 401) throw new Error('Could not revoke the session. Reconnect and retry logout.');
    }
  }
  sessionStorage.removeItem('token');
  for (let index = sessionStorage.length - 1; index >= 0; index--) {
    const key = sessionStorage.key(index);
    if (key?.startsWith('mtcards:')) sessionStorage.removeItem(key);
  }
}
