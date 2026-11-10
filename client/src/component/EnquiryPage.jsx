import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { whatsappUrl } from '../utils/inquiry';
import './workspace.css';
const openWhatsApp = url => window.location.assign(url);
export default function EnquiryPage({ navigate = openWhatsApp }) {
  const params = new URLSearchParams(useLocation().search);
  const url = whatsappUrl({ card: params.get('card') || params.get('cards') || '', quantity: params.get('quantity') || '' });
  useEffect(() => { if (url) navigate(url); }, [url, navigate]);
  return <main className="collection-content"><h1>WhatsApp पर बातचीत करें</h1>{url ? <><p role="status">WhatsApp खुल रहा है…</p><a className="primary-action" href={url}>WhatsApp पर कीमत पूछें ↗</a><p>चुने हुए कार्ड का विवरण संदेश में जुड़ गया है। WhatsApp में भेजें दबाएँ।</p></> : <p role="status">ऑनलाइन संपर्क अभी उपलब्ध नहीं है। कृपया दुकान पर संपर्क करें।</p>}</main>;
}
