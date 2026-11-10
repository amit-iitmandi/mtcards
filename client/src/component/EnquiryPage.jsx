import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './workspace.css';
export default function EnquiryPage({ navigate = url => window.location.assign(url) }) {
  const params = new URLSearchParams(useLocation().search);
  const [form, setForm] = useState({
    name: '',
    card: params.get('card') || params.get('cards') || '',
    quantity: params.get('quantity') || '',
    date: '',
    message: ''
  });
  const [ready, setReady] = useState(false);
  const phone = (process.env.REACT_APP_WHATSAPP_NUMBER || '').replace(/[\s+()-]/g, '');
  const email = process.env.REACT_APP_ENQUIRY_EMAIL || '';
  const validPhone = /^[1-9]\d{9,14}$/.test(phone),
        validEmail = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
  const body = `नमस्ते, मेरा नाम ${form.name} है।\nकार्ड: ${form.card || 'चुनने में मदद चाहिए'}\nमात्रा: ${form.quantity || 'अभी तय नहीं'}\nकार्यक्रम की तारीख: ${form.date || 'अभी तय नहीं'}\n${form.message}\nकृपया इस कार्ड की कीमत, उपलब्धता और प्रिंटिंग का खर्च बताएँ। मात्रा के अनुसार कुल कोटेशन भी भेजें।`;

  function input(key, e) {
    setForm(v => ({ ...v,
      [key]: e.target.value
    }));
    setReady(false);
  }

  return <main className="enquiry-page"><aside><p className="eyebrow">LET’S MAKE IT PERSONAL</p><h1>आपकी खुशियाँ,<br /><em>हमारी बातचीत।</em></h1><p>पसंद का कार्ड मिल गया या थोड़ी मदद चाहिए?<br />अपनी ज़रूरत हमें बताइए।</p><img src="/images/wedding-stationery-800.webp" alt="सुनहरी नक्काशी वाला विवाह निमंत्रण" /><small>माँ तारा कार्ड पैलेस · जखनियाँ, गाज़ीपुर</small></aside><section className="enquiry-form"><h2>शुरू करें एक बातचीत</h2><p>विवरण भरें और WhatsApp पर कीमत पूछें।</p><form onSubmit={e => {
        e.preventDefault();
        setReady(true);
        if (validPhone) navigate(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`);
      }}><label>आपका नाम<input required value={form.name} onChange={e => input('name', e)} /></label><div className="editor-form-grid"><label>कार्ड का कोड<input value={form.card} onChange={e => input('card', e)} placeholder="जैसे MT. 108" /></label><label>कार्ड की मात्रा<input type="number" min="1" step="1" value={form.quantity} onChange={e => input('quantity', e)} /></label></div><label>कार्यक्रम की तारीख<input type="date" value={form.date} onChange={e => input('date', e)} /></label><label>आपकी ज़रूरत<textarea rows={4} value={form.message} onChange={e => input('message', e)} placeholder="प्रिंटिंग, रंग या डिज़ाइन के बारे में बताएँ…" /></label><button type="submit" className="workspace-primary">WhatsApp पर कीमत पूछें ↗</button></form>{ready && <div className="enquiry-ready" role="status"><p>संदेश तैयार है। WhatsApp न खुले तो नीचे दिए लिंक का इस्तेमाल करें।</p>{validPhone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer">WhatsApp खोलें ↗</a>}{validEmail && <a href={`mailto:${email}?subject=${encodeURIComponent('विवाह कार्ड की पूछताछ')}&body=${encodeURIComponent(body)}`}>ईमेल खोलें ↗</a>}{!validPhone && !validEmail && <p>ऑनलाइन संपर्क अभी उपलब्ध नहीं है। कृपया दुकान पर संपर्क करें।</p>}</div>}<small>आपका संदेश अपने आप नहीं भेजा जाता। ऐप में भेजने के बाद ही दुकान तक पहुँचेगा।</small></section></main>;
}
