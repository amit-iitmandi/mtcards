import { useState } from 'react';
import PopupCard from './PopupCard';
import './post.css';
import { cardCode, inquiryUrl } from '../utils/inquiry';

const Post = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const code = cardCode(item);
  const whatsapp = inquiryUrl(item, process.env.REACT_APP_WHATSAPP_NUMBER);
  const enquiry = `/enquiry?card=${encodeURIComponent(code)}`;
  const cardHref = whatsapp || enquiry;
  const externalProps = whatsapp ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return <article className="post-card">
    <div className="post-visual">
      <a className="post-img" href={cardHref} {...externalProps} aria-label={`${code} के बारे में ${whatsapp ? 'WhatsApp पर पूछें' : 'पूछताछ करें'}`}>
        <img src={item.image && item.image[0]} loading="lazy" alt={`शादी का कार्ड ${code}`} />
      </a>
      <button type="button" className="image-gallery-button" onClick={() => setIsOpen(true)} aria-label={`कार्ड ${code} की तस्वीरें देखें`}>तस्वीरें देखें ↗</button>
    </div>
    <div className="post-details"><span className="product-category">{item.type1 || 'विवाह निमंत्रण'}</span>
      <div className="post-title"><h3><a href={cardHref} {...externalProps}>{code}</a></h3><p>{item.sPrice ? `₹ ${item.sPrice}` : 'कीमत पूछें'}{item.sPrice && <small> / कार्ड</small>}</p></div>
      <a className="card-detail-link" href={enquiry}>इस कार्ड की जानकारी लें ↗</a>
      <a className="product-inquiry" href={cardHref} {...externalProps}>{whatsapp ? 'WhatsApp पर पूछें' : 'पूछताछ करें'} <span>↗</span></a>
    </div>
    {isOpen && <PopupCard item={item} setIsOpen={setIsOpen} />}
  </article>;
};

export default Post;
