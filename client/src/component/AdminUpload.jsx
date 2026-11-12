import { useEffect, useState } from 'react';
import { Redirect, Link, useHistory } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { waitForCatalogueStartup } from '../utils/catalogue';
import CreatePost from './CreatePost';
import './admin.css';
import { endSession } from '../utils/session';
function storedToken() { try { return JSON.parse(sessionStorage.getItem('token'))?.data?.token; } catch { return null; } }
export default function AdminUpload(props) {
  const history = useHistory();
  const [state, setState] = useState('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const token = storedToken();
    if (typeof token !== 'string' || !token.startsWith('Bearer ')) { setState('login'); return; }
    setState('checking');
    const checkSession = () => active && axios.get(apiUrl('/admin/session'), { headers: { Authorization: token }, timeout: 15000 });
    const startup = waitForCatalogueStartup();
    (startup ? startup.then(checkSession) : checkSession())
      .then(() => { if (active) setState('ready'); })
      .catch(err => {
        if (!active) return;
        if (err.response?.status === 401) { sessionStorage.removeItem('token'); setState('login'); }
        else setState(err.response?.status === 403 ? 'denied' : 'unavailable');
      });
    return () => { active = false; };
  }, [attempt]);
  async function logout() {
    try { await endSession(); history.replace('/login'); }
    catch { setState('logout-failed'); }
  }
  if (state === 'login') return <Redirect to="/login" />;
  if (state === 'checking') return <main className="admin-page"><p role="status">खाता जाँचा जा रहा है…</p></main>;
  if (state !== 'ready') return <main className="admin-page"><section className="admin-panel"><p role="alert">{state === 'logout-failed' ? 'लॉगआउट नहीं हो सका। इंटरनेट कनेक्शन जाँचकर दोबारा कोशिश करें।' : state === 'denied' ? 'इस खाते को कार्ड जोड़ने की अनुमति नहीं है।' : 'खाता जाँचा नहीं जा सका। कृपया फिर कोशिश करें।'}</p>{state === 'unavailable' && <button onClick={() => setAttempt(value => value + 1)}>फिर कोशिश करें</button>}<button onClick={logout}>खाते से बाहर जाएँ</button><Link to="/">होम</Link></section></main>;
  if (props.children) return props.children;
  return <main><div className="admin-toolbar"><h1>नया कार्ड जोड़ें</h1><button onClick={logout}>लॉगआउट</button></div><CreatePost {...props} /></main>;
}
