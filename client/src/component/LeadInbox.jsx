import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { adminToken } from '../utils/uploadPhotos';

export default function LeadInbox() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState('loading');
    axios.get(apiUrl(`/admin/enquiries?page=${page}&limit=20&status=${status}`), {
      headers: { Authorization: adminToken() }, timeout: 20000
    }).then(({ data: result }) => {
      if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total)) throw new Error('Invalid leads');
      if (active) { setData(result); setState('ready'); }
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [page, status, attempt]);

  return <section><h1>Customer enquiries</h1>
    <p>Review callback requests and contact customers about their selected cards.</p>
    <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Open Google Analytics traffic reports ↗</a>
    <label className="lead-filter">Enquiry status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
      <option value="">All enquiries</option>
      {['new', 'contacted', 'quoted', 'closed', 'spam'].map(value => <option key={value}>{value}</option>)}
    </select></label>
    {state === 'loading' && <p role="status">Loading enquiries…</p>}
    {state === 'error' && <div role="alert"><p>Enquiries could not be loaded.</p><button onClick={() => setAttempt(value => value + 1)}>Retry enquiries</button></div>}
    {state === 'ready' && <><p>{data.total} enquiries{status ? ` · ${status}` : ''}</p>
      <div className="lead-list">{data.items.map(lead => <article key={lead._id}>
        <h2>{lead.customerName}</h2><p>{lead.status} · {lead.quantity} cards</p>
        <p>{lead.message}</p>
        {lead.phone && <a href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`}>{lead.phone}</a>}
        {lead.email && <p>{lead.email}</p>}
        <p>Received {new Date(lead.createdAt).toLocaleString('en-IN')}</p>
        <a href={`/admin/cards/${encodeURIComponent(lead.cardId)}/edit`}>View selected card →</a>
      </article>)}</div>
      {!data.items.length && <p>No enquiries in this view yet.</p>}
      <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
      <span> Page {page} </span>
      <button disabled={page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>Next</button>
    </>}
  </section>;
}
