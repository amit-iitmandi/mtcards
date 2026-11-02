import { useState } from 'react';
import PopupCard from './PopupCard';
import './post.css';
import { inquiryUrl } from '../utils/inquiry';
const Post = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const inquiry = inquiryUrl(item, import.meta.env.VITE_WHATSAPP_NUMBER);
  return <article className="post-card"><button className="post-img" onClick={() => setIsOpen(true)} aria-label={`कार्ड MT. ${item.title} की तस्वीरें देखें`}>
    <img src={item.image && item.image[0]} loading="lazy" alt={`शादी का कार्ड MT. ${item.title}`} /><span className="image-open">तस्वीरें देखें ↗</span>
  </button><div className="post-details"><span className="product-category">विवाह निमंत्रण</span><div className="post-title"><h3>MT. {item.title}</h3><p>₹ {item.sPrice}<small> / कार्ड</small></p></div>
    {inquiry && <a className="product-inquiry" href={inquiry} target="_blank" rel="noopener noreferrer">WhatsApp पर पूछें <span>↗</span></a>}
  </div>{isOpen && <PopupCard item={item} setIsOpen={setIsOpen} />}</article>;
};
export default Post;
