import { inquiryUrl, whatsappUrl } from '../utils/inquiry';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Home from './Home';
import './workspace.css';
export default function CataloguePage({
  categories
}) {
  const [filter, setFilter] = useState(''),
        [search, setSearch] = useState('');
  return <main className="collection-page"><section className="collection-banner"><div><p className="eyebrow">THE INVITATION EDIT</p><h1>हर कहानी का<br /><em>अपना निमंत्रण।</em></h1><p>अपनों को बुलाने का अंदाज़ भी तो आपका होना चाहिए।</p><a href={whatsappUrl()} className="text-action">चुनने में मदद चाहिए? ↗</a></div><img src="/images/wedding-story-800.webp" alt="विवाह निमंत्रण की कलात्मक झलक" /></section><section className="collection-content"><div className="section-heading"><div><p className="eyebrow">आपकी पसंद, आपका अंदाज़</p><h2>कार्ड संग्रह</h2></div><label className="catalogue-search"><span>⌕</span><input type="search" aria-label="कार्ड खोजें" placeholder="कार्ड का नाम या कोड खोजें" value={search} onChange={e => setSearch(e.target.value)} /></label></div><div className="category-list collection-categories">{categories.map(c => <button key={c.value} aria-pressed={filter === c.value} className={filter === c.value ? 'selected' : ''} onClick={() => setFilter(c.value)}>{c.name}</button>)}</div><Home filter={filter} search={search} /></section></main>;
}
