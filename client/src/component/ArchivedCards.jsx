import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCards } from '../utils/catalogue';
import { adminToken } from '../utils/uploadPhotos';

export default function ArchivedCards() {
  const [cards, setCards] = useState([]);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  useEffect(() => {
    let active = true;
    setState('loading');
    loadCards({ admin: true, token: adminToken(), status: 'archived' }).then(items => {
      if (active) { setCards(items.filter(card => card.status === 'archived')); setState('ready'); }
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [attempt]);
  const visible = cards.filter(card => String(card.title ?? '').toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="workspace-heading compact"><div><h1>Archived cards</h1><p>Browse designs archived from your active catalogue.</p></div><Link to="/admin/cards">Active card library →</Link></div>
    <label className="workspace-search">Search archived cards<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Card name or code" /></label>
    {state === 'loading' && <p role="status">Loading archived cards…</p>}
    {state === 'error' && <div role="alert"><p>Archived cards could not be loaded.</p><button onClick={() => setAttempt(value => value + 1)}>Retry archived cards</button></div>}
    {state === 'ready' && <><p>{visible.length} archived designs</p><div className="archived-card-grid">
      {visible.map(card => <article key={card._id}>
        {card.image?.[0] ? <img src={card.image[0]} alt={`Archived card MT. ${card.title}`} loading="lazy" /> : <div className="archived-photo-empty">No photo</div>}
        <div><h2>MT. {card.title}</h2><p>{card.type1} · {card.type2}</p><p>{card.cPrice != null ? `₹${card.cPrice}` : 'Price not recorded'}</p><Link to={`/admin/cards/${encodeURIComponent(card._id)}/edit`}>View / edit details →</Link></div>
      </article>)}
    </div>{!visible.length && <p>{cards.length ? 'No archived cards match your search.' : 'No cards have been archived yet.'}</p>}</>}
  </>;
}
