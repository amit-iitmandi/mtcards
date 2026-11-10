import { inquiryUrl, whatsappUrl } from '../utils/inquiry';
import { useEffect, useRef, useState } from 'react';
const PopupCard = ({ item, setIsOpen }) => {
  const [index, setIndex] = useState(0);
  const dialog = useRef(null);
  const images = Array.isArray(item.image) ? item.image : [];
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.focus();
    const keydown = event => {
      if (event.key === 'Escape') setIsOpen(false);
      if (event.key === 'Tab') {
        const buttons = dialog.current.querySelectorAll('button, a[href]');
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous) previous.focus(); };
  }, [setIsOpen]);
  return <div className="popup-container" onClick={event => { if (event.target === event.currentTarget) setIsOpen(false); }}>
    <div className="card-dialog" role="dialog" aria-modal="true" aria-label={`कार्ड MT. ${item.title}`} tabIndex={-1} ref={dialog}>
      <button className="dialog-close" onClick={() => setIsOpen(false)} aria-label="तस्वीरें बंद करें">×</button>
      <div className="dialog-image">{images.length > 0 && <img src={images[index]} alt={`कार्ड MT. ${item.title}, तस्वीर ${index + 1}`} />}</div>
      <section className="dialog-card-info"><p className="eyebrow">THE INVITATION DETAILS</p><h2>MT. {item.title}</h2><p>{item.description || "अपने शुभ अवसर के लिए इस निमंत्रण का पूरा रूप देखें।"}</p><dl><div><dt>श्रेणी</dt><dd>{item.type1 || "विवाह निमंत्रण"}</dd></div><div><dt>बनावट</dt><dd>{item.type2 || "जानकारी के लिए पूछें"}</dd></div></dl><a className="primary-action" href={inquiryUrl(item)}>इस कार्ड के बारे में पूछें ↗</a></section><div className="dialog-footer"><span>MT. {item.title} · ₹ {item.cPrice}</span>{images.length > 1 && <div><button onClick={() => setIndex(value => (value - 1 + images.length) % images.length)} aria-label="पिछली तस्वीर">←</button><span>{index + 1} / {images.length}</span><button onClick={() => setIndex(value => (value + 1) % images.length)} aria-label="अगली तस्वीर">→</button></div>}</div>
    </div>
  </div>;
};
export default PopupCard;
