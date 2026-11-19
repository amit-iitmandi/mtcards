import { useRef, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { trackConversion } from '../utils/analytics';

export default function CardLeadForm({ card, quantity }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const request = useRef(null);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const payload = {
      cardId: card._id,
      quantity: Number(fields.get('quantity')),
      customerName: String(fields.get('name')).trim(),
      phone: String(fields.get('phone')).trim(),
      message: 'Customer requested a callback and a printing quotation through the website.'
    };
    if (!/^\+?[\d ()-]{7,25}$/.test(payload.phone)) {
      setError('कृपया सही मोबाइल नंबर लिखें।');
      return;
    }
    const fingerprint = JSON.stringify(payload);
    if (request.current?.fingerprint !== fingerprint) request.current = {
      fingerprint, key: crypto.randomUUID()
    };
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(apiUrl('/enquiries'), {
        ...payload, idempotencyKey: request.current.key
      }, { timeout: 30000 });
      if (!data?.id) throw new Error('Unconfirmed enquiry');
      setSent(true);
      trackConversion('generate_lead');
    } catch {
      setError('पूछताछ सेव नहीं हो सकी। फिर कोशिश करें या ऊपर WhatsApp पर संपर्क करें।');
    } finally { setBusy(false); }
  }

  return <details className="card-lead"><summary>दुकान से कॉल और कोटेशन चाहिए?</summary>
    {sent ? <p role="status">आपकी पूछताछ सेव हो गई है। दुकान आपके दिए नंबर पर संपर्क कर सकती है।</p>
      : <form onSubmit={submit}>
        <label>आपका नाम<input name="name" autoComplete="name" maxLength={120} required /></label>
        <label>मोबाइल नंबर<input name="phone" type="tel" autoComplete="tel" maxLength={25} required /></label>
        <label>कोटेशन के लिए मात्रा<input name="quantity" type="number" min="1" max="1000000" step="1" defaultValue={quantity || 100} required /></label>
        <p>यह जानकारी माँ तारा कार्ड पैलेस को आपके कार्ड और प्रिंटिंग की पूछताछ पर संपर्क करने के लिए दी जाएगी।</p>
        <label><input type="checkbox" required /> इस पूछताछ के लिए मुझे कॉल या WhatsApp पर संपर्क करें।</label>
        {error && <p role="alert">{error}</p>}
        <button className="primary-action" disabled={busy}>{busy ? 'सेव हो रहा है…' : 'कॉल और कोटेशन माँगें'}</button>
      </form>}
  </details>;
}
