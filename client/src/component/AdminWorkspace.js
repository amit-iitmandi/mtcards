import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Switch, useHistory } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import AdminUpload from './AdminUpload';
import CardEditor from './CardEditor';
import './workspace.css';
const nav = [['/admin', '◈', 'Overview'], ['/admin/cards', '▤', 'Card library'], ['/admin/stock', '▦', 'Stock room'], ['/admin/enquiries', '◌', 'Enquiries'], ['/admin/settings', '⚙', 'Shop settings']];
export function stockNumber(value) {
  return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}

const money = value => Number.isFinite(Number(value)) ? `₹${Number(value).toLocaleString('en-IN')}` : '—';

function Empty({
  title,
  children
}) {
  return <div className="workspace-empty"><span aria-hidden="true">✺</span><h3>{title}</h3><p>{children}</p></div>;
}

export default function AdminWorkspace(props) {
  return <AdminUpload {...props}><Workspace {...props} /></AdminUpload>;
}

function Workspace({
  type1,
  type2
}) {
  const [cards, setCards] = useState([]),
        [status, setStatus] = useState('loading'),
        [attempt, setAttempt] = useState(0),
        [query, setQuery] = useState(''),
        [category, setCategory] = useState(''),
        [stockFilter, setStockFilter] = useState('all'),
        [deleting, setDeleting] = useState(null),
        [busy, setBusy] = useState(false),
        [notice, setNotice] = useState('');
  const history = useHistory();
  useEffect(() => {
    let active = true;
    setStatus('loading');
    axios.get(apiUrl('/allPost'), {
      timeout: 15000
    }).then(({
      data
    }) => {
      if (!Array.isArray(data)) throw Error();

      if (active) {
        setCards(data);
        setStatus('ready');
      }
    }).catch(() => {
      if (active) setStatus('error');
    });
    return () => {
      active = false;
    };
  }, [attempt]);
  const known = cards.filter(c => stockNumber(c.stock) !== null),
        low = known.filter(c => stockNumber(c.stock) > 0 && stockNumber(c.stock) <= 20),
        out = known.filter(c => stockNumber(c.stock) === 0);
  const visible = cards.filter(c => String(c.title || '').toLowerCase().includes(query.toLowerCase()) && (!category || c.type1 === category) && (stockFilter === 'all' || stockNumber(c.stock) !== null && (stockFilter === 'out' ? stockNumber(c.stock) === 0 : stockNumber(c.stock) > 0 && stockNumber(c.stock) <= 20)));

  async function deleteCard() {
    if (busy) return;
    setBusy(true);
    setNotice('');

    try {
      const token = JSON.parse(sessionStorage.getItem('token'))?.data?.token;
      if (!token) throw Error();
      const {
        data
      } = await axios.delete(apiUrl(`/deletePost/${encodeURIComponent(deleting._id)}`), {
        headers: {
          Authorization: token
        },
        timeout: 15000
      });
      if (data?.success !== true) throw Error();
      setCards(list => list.filter(c => c._id !== deleting._id));
      setDeleting(null);
      setNotice('Card deleted.');
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem('token');
        history.replace('/login');
      } else setNotice('Card could not be deleted. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem('token');
    history.replace('/login');
  }

  const metrics = <div className="workspace-metrics">{[['Card designs', cards.length, 'in your catalogue'], ['Recorded stock', known.reduce((sum, c) => sum + stockNumber(c.stock), 0).toLocaleString('en-IN'), 'legacy stock units · verify set mapping'], ['Low stock', low.length, '1–20 recorded units'], ['Out of stock', out.length, 'needs your attention']].map(([label, value, hint]) => <article key={label}><span>{label}</span><strong>{status === 'ready' ? value : '—'}</strong><small>{hint}</small></article>)}</div>;
  const filters = <div className="workspace-filters"><label className="workspace-search"><span>⌕</span><input aria-label="Search cards" placeholder="Search card name or code…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{type1.map(t => <option key={t.name}>{t.name}</option>)}</select><select aria-label="Stock filter" value={stockFilter} onChange={e => setStockFilter(e.target.value)}><option value="all">All stock levels</option><option value="low">Low stock · ≤20</option><option value="out">Out of stock</option></select></div>;

  function table(stockOnly = false) {
    return <>{filters}<div className="workspace-table-wrap"><table className="workspace-table"><caption className="sr-only">{stockOnly ? 'Stock of all cards' : 'Card library'}</caption><thead><tr><th>Card / design</th><th>Category</th><th>{stockOnly ? 'Recorded stock' : 'Selling price'}</th><th>{stockOnly ? 'Availability' : 'Stock'}</th><th>Actions</th></tr></thead><tbody>{visible.map((c, i) => {
              const n = stockNumber(c.stock);
              return <tr key={c._id || i}><td><div className="workspace-product">{c.image?.[0] ? <img src={c.image[0]} alt="" loading="lazy" /> : <span>✺</span>}<div><strong>MT. {c.title}</strong><small>{c.type2 || 'Wedding invitation'}</small></div></div></td><td>{c.type1 || '—'}</td><td>{stockOnly ? n === null ? 'Not recorded' : n.toLocaleString('en-IN') : money(c.sPrice)}</td><td><span className={`stock-badge ${n === null ? 'unknown' : n === 0 ? 'out' : n <= 20 ? 'low' : 'available'}`}>{n === null ? 'Not recorded' : n === 0 ? 'Out of stock' : n <= 20 ? 'Low stock' : stockOnly ? 'In stock' : `${n} units`}</span></td><td><div className="row-actions"><Link to={`/admin/cards/${encodeURIComponent(c._id || 'unknown')}/edit`}>{stockOnly ? 'View / adjust' : 'Edit'}</Link><button disabled={!c._id} onClick={() => {
                      setNotice('');
                      setDeleting(c);
                    }}>Delete</button></div></td></tr>;
            })}</tbody></table></div>{!visible.length && <Empty title="No cards found">Try another code or category, or add your first card.</Empty>}<div className="workspace-table-footer">{visible.length} of {cards.length} designs <span>Stock figures are the existing recorded values.</span></div></>;
  }

  const content = status === 'loading' ? <div className="workspace-skeleton" role="status">Loading your catalogue…</div> : status === 'error' ? <Empty title="Your catalogue could not be loaded"><button onClick={() => setAttempt(v => v + 1)}>Retry catalogue</button></Empty> : null;
  return <div className="admin-workspace" lang="en"><aside className="workspace-sidebar"><Link className="workspace-brand" to="/admin"><span>माँ</span><div>MAA TARA<small>SHOP STUDIO</small></div></Link><p className="sidebar-label">WORKSPACE</p><nav aria-label="Admin navigation">{nav.map(([to, icon, label]) => <NavLink exact={to === '/admin'} to={to} key={to} activeClassName="active"><span aria-hidden="true">{icon}</span>{label}</NavLink>)}</nav><div className="sidebar-bottom"><Link to="/">↗ View storefront</Link><button onClick={logout}>Log out</button><small>माँ तारा कार्ड पैलेस<br />जखनियाँ · गाज़ीपुर</small></div></aside><main className="workspace-main"><header className="workspace-topbar"><span>YOUR SHOP, BEAUTIFULLY ORGANISED</span><div><span className="workspace-avatar">MT</span> Shop administrator</div></header><div className="workspace-body">{notice && <p role="status" className="workspace-notice">{notice}</p>}<Switch>
 <Route exact path="/admin"><div className="workspace-heading"><div><p>THE EVERYDAY, MADE EASIER</p><h1>A little order.<br /><em>A lot of possibilities.</em></h1><span>Your cards, stock and conversations. All in one place.</span></div><Link className="workspace-primary" to="/admin/cards/new">＋ Add a card</Link></div>{metrics}{content || <><div className="workspace-section-title"><h2>Your card collection</h2><Link to="/admin/cards">View all designs ↗</Link></div><div className="workspace-recent">{cards.slice(0, 4).map((c, i) => <Link key={c._id || i} to={`/admin/cards/${encodeURIComponent(c._id || 'unknown')}/edit`}>{c.image?.[0] ? <img src={c.image[0]} alt={`Card ${c.title}`} /> : <div className="recent-placeholder">✺</div>}<div><strong>MT. {c.title}</strong><span>{money(c.sPrice)}</span></div></Link>)}</div>{!cards.length && <Empty title="Your collection starts here">Add a card to bring your shop catalogue to life.</Empty>}<div className="workspace-bottom-grid"><article className="workspace-note"><span>STOCK CHECK</span><h2>A little check, before<br />the next celebration.</h2><p>{low.length + out.length} designs have low or zero recorded stock.</p><Link to="/admin/stock">Open stock room →</Link></article><article className="workspace-note light"><span>YOUR NEXT CONVERSATION</span><h2>Every enquiry is<br />a new beginning.</h2><p>Enquiry tracking will appear here when connected.</p><Link to="/admin/enquiries">Explore enquiries →</Link></article></div></>}</Route>
 <Route exact path="/admin/cards"><div className="workspace-heading compact"><div><p>THE COLLECTION</p><h1>Card library<span className="heading-dot">.</span></h1><span>A home for every beautiful invitation.</span></div><Link className="workspace-primary" to="/admin/cards/new">＋ Add a card</Link></div>{content || table()}</Route>
 <Route exact path="/admin/stock"><div className="workspace-heading compact"><div><p>KNOW WHAT’S ON YOUR SHELF</p><h1>The stock room<span className="heading-dot">.</span></h1><span>Search every design and spot what needs replenishing.</span></div></div>{metrics}<p className="workspace-notice">Legacy quantities are shown as recorded units. Sets, reservations and stock adjustments await inventory integration.</p>{content || table(true)}</Route>
 <Route exact path="/admin/cards/new"><CardEditor type1={type1} type2={type2} /></Route>
 <Route path="/admin/cards/:id/edit" render={({
            match
          }) => content || <CardEditor key={match.params.id} item={cards.find(c => c._id === match.params.id)} editing type1={type1} type2={type2} />} />
 <Route exact path="/admin/enquiries"><div className="workspace-heading compact"><div><p>KEEP THE CONVERSATION GOING</p><h1>Enquiry inbox<span className="heading-dot">.</span></h1><span>From a first hello to their perfect invitation.</span></div></div><div className="inbox-layout"><div className="inbox-tabs"><strong>All conversations</strong><span>New</span><span>Following up</span><span>Closed</span></div><Empty title="Your conversations will belong here">The inbox is awaiting connection. Email and WhatsApp conversations are not imported automatically.</Empty></div><div className="workspace-note light"><h2>Designed for the way you work</h2><p>Selected cards, quantities, event date, contact details and follow-up status will stay together in each enquiry.</p></div></Route>
 <Route exact path="/admin/settings"><div className="workspace-heading compact"><div><p>THE DETAILS THAT MAKE IT YOURS</p><h1>Shop settings<span className="heading-dot">.</span></h1></div></div><div className="settings-grid"><article className="workspace-note light"><h2>Shop identity</h2><p>माँ तारा कार्ड पैलेस</p><p>जखनियाँ, गाज़ीपुर, उत्तर प्रदेश</p><small>Shop profile editing awaits settings integration.</small></article><article className="workspace-note light"><h2>Inventory preferences</h2><p>Counting unit: sets (planned)</p><p>Low-stock view: 20 recorded units</p><small>Per-card thresholds and envelope tracking await inventory integration.</small></article><article className="workspace-note light"><h2>Your account</h2><p>Your account is verified by the administrator session endpoint.</p><button className="workspace-secondary" onClick={logout}>Log out securely</button></article></div></Route>
 <Route><Empty title="Page not found"><Link to="/admin">Back to overview</Link></Empty></Route>
 </Switch></div></main>{deleting && <DeleteDialog item={deleting} busy={busy} notice={notice} cancel={() => !busy && setDeleting(null)} confirm={deleteCard} />}</div>;
}

function DeleteDialog({
  item,
  busy,
  notice,
  cancel,
  confirm
}) {
  useEffect(() => {
    const old = document.activeElement;
    return () => old?.focus();
  }, []);
  return <div className="workspace-overlay"><section className="workspace-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-title" onKeyDown={e => {
      if (e.key === 'Escape') cancel();

      if (e.key === 'Tab') {
        const buttons = e.currentTarget.querySelectorAll('button');
        const first = buttons[0],
              last = buttons[buttons.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }}><span className="delete-symbol">!</span><h2 id="delete-title">Delete MT. {item.title}?</h2><p>This permanently removes this card from the catalogue. This action cannot be undone.</p>{notice && <p role="alert">{notice}</p>}<div><button autoFocus disabled={busy} onClick={cancel}>Keep card</button><button className="danger-action" disabled={busy} onClick={confirm}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div></section></div>;
}
