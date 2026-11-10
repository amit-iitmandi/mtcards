import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { adminToken, uploadPhotos, releasePhotos, uploadErrorText } from '../utils/uploadPhotos';
import { validateSourceImages } from '../utils/compressImages';
import { currentCardYear } from '../utils/cardYear';
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
      return { ...initial, addedYear: currentCardYear(),
        ...item,
        ...JSON.parse(sessionStorage.getItem(draftKey) || 'null')
      };
    } catch {
      return { ...initial, addedYear: currentCardYear(),
        ...item
      };
    }
  }),
        [createdCard, setCreatedCard] = useState(null),
        [pendingStock, setPendingStock] = useState(null),
        [phase, setPhase] = useState(''),
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

  function finishCreate() {
    sessionStorage.removeItem(draftKey);
    files.forEach(entry => URL.revokeObjectURL(entry.url));
    setFiles([]);
    setForm({ ...initial, addedYear: currentCardYear() });
    setCreatedCard(null);
    setPendingStock(null);
    setMessage('Card created in the catalogue with its photos and stock.');
    setError('');
  }

  async function recordStock(cardId, request, token) {
    const { data } = await axios.post(apiUrl(`/admin/inventory/${encodeURIComponent(cardId)}/adjustments`), request, {
      headers: { Authorization: token }, timeout: 20000
    });
    if (!data?.inventory) throw new Error('Stock update was not confirmed');
  }

  async function retryStock() {
    if (!pendingStock || busy) return;
    setBusy(true);
    setPhase('Checking the saved stock adjustment…');
    try {
      const token = adminToken();
      if (!token) throw new Error('Your session expired. Please log in again.');
      await recordStock(pendingStock.cardId, pendingStock.request, token);
      finishCreate();
    } catch (err) {
      setError('Card was created, but stock is still unconfirmed. ' + uploadErrorText(err));
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  async function publish(e) {
    e.preventDefault();
    if (busy || editing || createdCard) return;
    setError('');
    setMessage('');
    const rawFiles = files.map(entry => entry.file);
    try {
      validateSourceImages(rawFiles);
      if (!Number.isSafeInteger(Number(form.addedYear)) || Number(form.addedYear) < 1900 || Number(form.addedYear) > currentCardYear()) {
        throw new Error('Enter a valid card added year between 1900 and ' + currentCardYear() + '.');
      }
      if (!Number.isSafeInteger(Number(form.stock)) || Number(form.stock) < 0) {
        throw new Error('Enter a valid nonnegative whole number for stock.');
      }
    } catch (err) {
      setError(err.message);
      return;
    }
    setBusy(true);
    let assets = [];
    let savedCard = null;
    let token = null;
    try {
      token = adminToken();
      if (!token) throw new Error('Your session expired. Please log in again.');
      setPhase('Optimizing your photos…');
      assets = await uploadPhotos(rawFiles, token, setPhase);
      setPhase('Saving your card…');
      const payload = {
        title: String(form.title).trim(),
        addedYear: Number(form.addedYear),
        cPrice: String(form.cPrice),
        sPrice: String(form.sPrice),
        description: form.description || '',
        type1: form.type1,
        type2: form.type2,
        status: 'published',
        imageAssetIds: assets.map(asset => asset.id)
      };
      const { data } = await axios.post(apiUrl('/admin/cards'), payload, {
        headers: { Authorization: token }, timeout: 20000
      });
      if (!data?.card?._id) throw new Error('The card save could not be confirmed; check the library before retrying.');
      savedCard = data.card;
      setCreatedCard(savedCard);
      const quantity = Number(form.stock);
      if (quantity > 0) {
        setPhase('Recording initial stock…');
        // Reusing this key on retry makes an uncertain stock response safe to retry.
        const key = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : `initial-stock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const request = { delta: quantity, reason: 'purchase', expectedVersion: 0, idempotencyKey: key };
        try {
          await recordStock(savedCard._id, request, token);
        } catch (err) {
          setPendingStock({ cardId: savedCard._id, request });
          setError('Card and photos were saved, but stock is not confirmed. Use Retry stock update below; do not create a duplicate card.');
          return;
        }
      }
      finishCreate();
    } catch (err) {
      // Unattached image assets can be removed, but the backend refuses to delete
      // any assets already attached to a card if its response was lost.
      if (!savedCard && assets.length) await releasePhotos(assets, token);
      setError(uploadErrorText(err));
    } finally {
      setBusy(false);
      setPhase('');
    }
  }

  if (editing && !item) return <div className="workspace-empty"><h1>Card not found</h1><Link to="/admin/cards">Back to library</Link></div>;
  return <><Link className="editor-back" to="/admin/cards">← Back to card library</Link><div className="workspace-heading compact"><div><p>MAKE ROOM FOR SOMETHING BEAUTIFUL</p><h1>{editing ? 'Refine your card' : 'A new invitation'}<span className="heading-dot">.</span></h1><span>{editing ? `Editing MT. ${item.title}` : 'Every celebration starts with a little detail.'}</span></div><button className="workspace-secondary" onClick={draft}>Save session draft</button></div>
 {editing && <p className="workspace-notice">Design preview · editing is available here as a session draft. Publishing changes and stock adjustments will be enabled after backend integration.</p>}
 {message && <p className="workspace-notice" role="status">{message}</p>}{phase && <p className="workspace-notice" role="status">{phase}</p>}{error && <p className="workspace-error" role="alert">{error}</p>}{pendingStock && <div className="workspace-notice"><button className="workspace-primary" type="button" disabled={busy} onClick={retryStock}>Retry stock update</button> <Link to="/admin/cards">View saved card in library</Link></div>}
 <form className="editor-layout" onSubmit={publish}><div className="editor-fields"><section className="editor-panel"><div className="editor-panel-title"><span>01</span><div><h2>The essentials</h2><p>A clear identity for your card.</p></div></div><div className="editor-form-grid"><label>Card code<input required maxLength={50} value={form.title} onChange={e => field('title', e.target.value)} placeholder="e.g. 108" /></label><label>Card added year<input type="number" required min="1900" max={currentCardYear()} step="1" value={form.addedYear ?? ''} onChange={e => field('addedYear', e.target.value)} /></label><label>Category<select value={form.type1} onChange={e => field('type1', e.target.value)}>{type1.map(t => <option key={t.name}>{t.name}</option>)}</select></label><label>Card format<select value={form.type2} onChange={e => field('type2', e.target.value)}>{type2.map(t => <option key={t.name}>{t.name}</option>)}</select></label><label>Recorded stock<input aria-label="Recorded stock" type="number" required min="0" step="1" value={form.stock} onChange={e => field('stock', e.target.value)} /><small>Existing units. Sets and envelope counts need inventory integration.</small></label><label>Customer price · ₹<input type="number" min="0" required step="0.01" value={form.cPrice} onChange={e => field('cPrice', e.target.value)} /></label><label>Selling price · ₹<input type="number" min="0" required step="0.01" value={form.sPrice} onChange={e => field('sPrice', e.target.value)} /></label><label className="full-width">Description<textarea rows={4} maxLength={2000} value={form.description} onChange={e => field('description', e.target.value)} placeholder="Paper finish, colours, printing details…" /></label></div></section>
 <section className="editor-panel"><div className="editor-panel-title"><span>02</span><div><h2>Let the details shine</h2><p>Choose bright, clear photographs of your invitation.</p></div></div><label className="editor-dropzone"><span>↑</span><strong>Choose photos to upload</strong><small>JPG, PNG or WebP · up to 12 photos, 20 MB each before compression</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || !!createdCard || editing} onChange={e => {
              const selected = Array.from(e.target.files || []);
              e.target.value = '';
              if (!selected.length) return;
              try {
                validateSourceImages(selected);
              } catch (err) {
                setError(err.message);
                return;
              }
              files.forEach(entry => URL.revokeObjectURL(entry.url));
              setFiles(selected.map(file => ({
                url: URL.createObjectURL(file),
                name: file.name,
                file
              })));
              setError('');
            }} /></label><p className="editor-help">Photos are automatically compressed on your device before secure upload. Large photos are resized to 2,400 pixels; your original files stay unchanged. Only you and authorized shop administrators can publish.</p><div className="editor-thumbnails">{(form.image || []).map((url, i) => <div key={`${url}-${i}`}><img src={url} alt={`Invitation detail ${i + 1}`} /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => field('image', form.image.filter((_, n) => n !== i))}>×</button></div>)}{files.map((f, i) => <div key={f.url}><img src={f.url} alt={f.name} /><button type="button" disabled={busy || !!createdCard} aria-label={`Remove local preview ${i + 1}`} onClick={() => {
                URL.revokeObjectURL(f.url);
                setFiles(v => v.filter((_, n) => n !== i));
              }}>×</button></div>)}</div></section><div className="editor-savebar"><span>{editing ? 'Session draft only' : 'Review your details before creating the card.'}</span><button className="workspace-primary" type="submit" disabled={editing || busy || !!createdCard}>{busy ? 'Creating…' : editing ? 'Publish changes · pending' : createdCard ? 'Card saved · stock pending' : 'Create card'}</button></div></div>
 <aside className="editor-preview"><p>STOREFRONT PREVIEW</p><div className="preview-card"><div className="preview-image">{form.image?.[0] || files[0]?.url ? <img src={form.image?.[0] || files[0]?.url} alt="Invitation preview" /> : <span>शुभ<br />आमंत्रण</span>}</div><div><small>{form.type1}</small><h3>MT. {form.title || 'Your card code'}</h3><strong>₹ {form.sPrice || '—'} <small>/ card</small></strong><p>{form.description || 'Your invitation, beautifully presented.'}</p></div></div><div className="preview-tip"><span>✺</span><p>A lovely first impression starts with a clear photo. Keep the background simple and the whole card visible.</p></div></aside></form></>;
}
