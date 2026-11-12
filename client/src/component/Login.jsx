import { useState, useEffect, useRef } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { waitForCatalogueStartup } from '../utils/catalogue';
import './admin.css';

export default function Login() {
  const history = useHistory();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await waitForCatalogueStartup();
      if (!active.current) return;
      const { data } = await axios.post(apiUrl('/login'), { email: email.trim().toLowerCase(), userPass: password }, { timeout: 15000 });
      if (!data || typeof data.token !== 'string' || !data.token.startsWith('Bearer ')) throw new Error('Invalid session');
      await axios.get(apiUrl('/admin/session'), { headers: { Authorization: data.token }, timeout: 15000 });
      if (!active.current) return;
      sessionStorage.setItem('token', JSON.stringify({ data: { token: data.token } }));
      setPassword(''); history.replace('/admin');
    } catch (err) {
      if (!active.current) return;
      sessionStorage.removeItem('token');
      setError(err.response?.status === 403 ? 'इस खाते को व्यवस्थापक की अनुमति नहीं है।' : err.response?.status === 401 ? 'ईमेल या पासवर्ड सही नहीं है।' : 'लॉगिन अभी उपलब्ध नहीं है। कृपया फिर कोशिश करें।');
    } finally { if (active.current) setBusy(false); }
  }
  return <main className="admin-page auth-editorial"><aside className="auth-story" style={{backgroundImage:"linear-gradient(#351d2699,#351d26bb),url(/images/wedding-story-800.webp)"}}><span>MAA TARA · SHOP STUDIO</span><h2>खूबसूरत निमंत्रण।<br/><em>सलीके से कारोबार।</em></h2><p>आपके कार्ड, आपका स्टॉक, आपकी अपनी जगह।</p><Link to="/">स्टोर पर वापस जाएँ ↗</Link></aside><section className="admin-panel">
    <p className="eyebrow">माँ तारा कार्ड पैलेस</p><h1>व्यवस्थापक लॉगिन</h1>
    <p>कार्ड के विवरण और तस्वीरें जोड़ने के लिए प्रवेश करें।</p>
    {location.state?.passwordCreated && <p role="status">पासवर्ड तैयार है। अब अपने खाते से लॉगिन करें।</p>}
    <form onSubmit={submit}>
      <label htmlFor="admin-email">ईमेल</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="admin-password">पासवर्ड</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p role="alert">{error}</p>}
      <button className="primary-action" type="submit" disabled={busy}>{busy ? 'प्रवेश हो रहा है…' : 'लॉगिन करें'}</button>
    </form><Link to="/admin/setup">पहली बार? पासवर्ड बनाएँ</Link>
  </section></main>;
}
