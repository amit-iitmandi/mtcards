import { useState, useEffect, useRef } from 'react';
import { Link, useHistory } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import './admin.css';
export default function AdminSetup() {
  const history = useHistory();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setError('');
    if (password !== confirm) { setError('दोनों पासवर्ड एक जैसे होने चाहिए।'); return; }
    setBusy(true);
    try {
      const { data } = await axios.post(apiUrl('/admin/setup'), { token: token.trim(), password }, { timeout: 15000 });
      if (!active.current) return;
      if (!data?.success) throw new Error('Setup unavailable');
      setToken(''); setPassword(''); setConfirm('');
      history.replace('/login', { passwordCreated: true });
    } catch (err) {
      if (!active.current) return;
      setError(err.response?.status === 400 ? 'सेटअप कोड गलत, समाप्त या पहले इस्तेमाल हो चुका है। पासवर्ड 12 अक्षर या अधिक और अधिकतम 72 UTF-8 बाइट होना चाहिए।' : 'पासवर्ड अभी नहीं बनाया जा सका। कृपया फिर कोशिश करें।');
    } finally { if (active.current) setBusy(false); }
  }
  return <main className="admin-page"><section className="admin-panel">
    <p className="eyebrow">सुरक्षित खाता सेटअप</p><h1>अपना पासवर्ड बनाएँ</h1>
    <p>आपको दिया गया एक बार इस्तेमाल होने वाला सेटअप कोड डालें। अपना पासवर्ड केवल यहाँ दर्ज करें।</p>
    <form onSubmit={submit}>
      <label htmlFor="setup-code">सेटअप कोड</label><input id="setup-code" type="password" autoComplete="off" required value={token} onChange={e => setToken(e.target.value)} />
      <label htmlFor="new-password">नया पासवर्ड</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} />
      <label htmlFor="confirm-password">पासवर्ड दोबारा लिखें</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button className="primary-action" type="submit" disabled={busy}>{busy ? 'सहेजा जा रहा है…' : 'पासवर्ड बनाएँ'}</button>
    </form><Link to="/login">लॉगिन पेज पर जाएँ</Link>
  </section></main>;
}
