import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
const initial = {
  title: '',
  cPrice: '',
  sPrice: '',
  stock: '',
  description: '',
  image: [],
  type1: 'Hindu Wedding Card',
  type2: 'Single Card'
};
export default function CardEditor({
  item,
  editing = false,
  type1 = [],
  type2 = []
}) {
  const draftKey = `mtcards:card-draft:${editing ? item?._id || 'missing' : 'new'}`;
  const [form, setForm] = useState(() => {
    try {
      return { ...initial,
        ...item,
        ...JSON.parse(sessionStorage.getItem(draftKey) || 'null')
      };
    } catch {
      return { ...initial,
        ...item
      };
    }
  }),
        [imageUrl, setImageUrl] = useState(''),
        [message, setMessage] = useState(''),
        [error, setError] = useState(''),
        [busy, setBusy] = useState(false),
        [files, setFiles] = useState([]);
  const previews = useRef([]);
  useEffect(() => {
    previews.current = files;
  }, [files]);
  useEffect(() => () => previews.current.forEach(f => URL.revokeObjectURL(f.url)), []);

  function field(key, value) {
    setForm(v => ({ ...v,
      [key]: value
    }));
    setMessage('');
  }

  function draft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(form));
      setMessage('Draft saved in this browser session. Your live card has not changed.');
    } catch {
      setError('Draft could not be saved. Keep this page open.');
    }
  }

  function addImage() {
    try {
      const url = new URL(imageUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw Error();
      field('image', [...(form.image || []), url.href]);
      setImageUrl('');
      setError('');
    } catch {
      setError('Enter a valid HTTPS image URL.');
    }
  }

  async function publish(e) {
    e.preventDefault();
    if (busy || editing) return;
    setError('');
    setMessage('');

    if (files.length) {
      setError('Local images are previews only. Add hosted image links before publishing.');
      return;
    }

    if (!form.image?.length) {
      setError('Add at least one hosted image link.');
      return;
    }

    setBusy(true);

    try {
      const token = JSON.parse(sessionStorage.getItem('token'))?.data?.token;
      if (typeof token !== 'string' || !token.startsWith('Bearer ')) throw Error();
      const {
        data
      } = await axios.post(apiUrl('/createPost'), form, {
        headers: {
          Authorization: token
        },
        timeout: 15000
      });
      if (!data?.post) throw Error();
      sessionStorage.removeItem(draftKey);
      setForm(initial);
      setMessage('Card created in the catalogue.');
    } catch (err) {
      setError(err.response?.status === 401 ? 'Your session expired. Please log in again.' : err.response?.status === 403 ? 'Your account cannot create cards.' : 'Card could not be saved. Your details are still here.');
    } finally {
      setBusy(false);
    }
  }

  if (editing && !item) return <div className="workspace-empty"><h1>Card not found</h1><Link to="/admin/cards">Back to library</Link></div>;
  return <><Link className="editor-back" to="/admin/cards">← Back to card library</Link><div className="workspace-heading compact"><div><p>MAKE ROOM FOR SOMETHING BEAUTIFUL</p><h1>{editing ? 'Refine your card' : 'A new invitation'}<span className="heading-dot">.</span></h1><span>{editing ? `Editing MT. ${item.title}` : 'Every celebration starts with a little detail.'}</span></div><button className="workspace-secondary" onClick={draft}>Save session draft</button></div>
 {editing && <p className="workspace-notice">Design preview · editing is available here as a session draft. Publishing changes and stock adjustments will be enabled after backend integration.</p>}
 {message && <p className="workspace-notice" role="status">{message}</p>}{error && <p className="workspace-error" role="alert">{error}</p>}
 <form className="editor-layout" onSubmit={publish}><div className="editor-fields"><section className="editor-panel"><div className="editor-panel-title"><span>01</span><div><h2>The essentials</h2><p>A clear identity for your card.</p></div></div><div className="editor-form-grid"><label>Card code<input required maxLength={50} value={form.title} onChange={e => field('title', e.target.value)} placeholder="e.g. 108" /></label><label>Category<select value={form.type1} onChange={e => field('type1', e.target.value)}>{type1.map(t => <option key={t.name}>{t.name}</option>)}</select></label><label>Card format<select value={form.type2} onChange={e => field('type2', e.target.value)}>{type2.map(t => <option key={t.name}>{t.name}</option>)}</select></label><label>Recorded stock<input aria-label="Recorded stock" type="number" required min="0" step="1" value={form.stock} onChange={e => field('stock', e.target.value)} /><small>Existing units. Sets and envelope counts need inventory integration.</small></label><label>Customer price · ₹<input type="number" min="0" required step="0.01" value={form.cPrice} onChange={e => field('cPrice', e.target.value)} /></label><label>Selling price · ₹<input type="number" min="0" required step="0.01" value={form.sPrice} onChange={e => field('sPrice', e.target.value)} /></label><label className="full-width">Description<textarea rows={4} maxLength={2000} value={form.description} onChange={e => field('description', e.target.value)} placeholder="Paper finish, colours, printing details…" /></label></div></section>
 <section className="editor-panel"><div className="editor-panel-title"><span>02</span><div><h2>Let the details shine</h2><p>Choose bright, clear photographs of your invitation.</p></div></div><label className="editor-dropzone"><span>↑</span><strong>Choose photos to preview</strong><small>JPG, PNG or WebP · up to 5 MB per image</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => {
              const selected = Array.from(e.target.files || []);

              if (selected.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024)) {
                setError('Use JPG, PNG or WebP files smaller than 5 MB.');
                return;
              }

              files.forEach(f => URL.revokeObjectURL(f.url));
              setFiles(selected.map(f => ({
                url: URL.createObjectURL(f),
                name: f.name
              })));
              setError('');
            }} /></label><p className="editor-help">Photo upload awaits a secure upload service. Local selections are visual previews; to create a card now, use hosted HTTPS image links.</p><div className="editor-url"><label>Hosted image URL<input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" /></label><button type="button" onClick={addImage}>Add image</button></div><div className="editor-thumbnails">{(form.image || []).map((url, i) => <div key={`${url}-${i}`}><img src={url} alt={`Invitation detail ${i + 1}`} /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => field('image', form.image.filter((_, n) => n !== i))}>×</button></div>)}{files.map((f, i) => <div key={f.url}><img src={f.url} alt={f.name} /><button type="button" aria-label={`Remove local preview ${i + 1}`} onClick={() => {
                URL.revokeObjectURL(f.url);
                setFiles(v => v.filter((_, n) => n !== i));
              }}>×</button></div>)}</div></section><div className="editor-savebar"><span>{editing ? 'Session draft only' : 'Review your details before creating the card.'}</span><button className="workspace-primary" type="submit" disabled={editing || busy}>{busy ? 'Creating…' : editing ? 'Publish changes · pending' : 'Create card'}</button></div></div>
 <aside className="editor-preview"><p>STOREFRONT PREVIEW</p><div className="preview-card"><div className="preview-image">{form.image?.[0] || files[0]?.url ? <img src={form.image?.[0] || files[0]?.url} alt="Invitation preview" /> : <span>शुभ<br />आमंत्रण</span>}</div><div><small>{form.type1}</small><h3>MT. {form.title || 'Your card code'}</h3><strong>₹ {form.sPrice || '—'} <small>/ card</small></strong><p>{form.description || 'Your invitation, beautifully presented.'}</p></div></div><div className="preview-tip"><span>✺</span><p>A lovely first impression starts with a clear photo. Keep the background simple and the whole card visible.</p></div></aside></form></>;
}
