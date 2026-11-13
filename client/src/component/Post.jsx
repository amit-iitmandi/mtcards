import { useState } from 'react';
import PopupCard from './PopupCard';
import {SaveCard} from './Shortlist';
import './post.css';
import { inquiryUrl } from '../utils/inquiry';
function movePhotoZoom(event) {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  const photo = event.currentTarget.querySelector('.post-photo');
  if (!photo) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const percent = (offset, size) => Math.max(0, Math.min(100, 100 * offset / size));
  const x = percent(event.clientX - bounds.left - photo.offsetLeft, photo.offsetWidth);
  const y = percent(event.clientY - bounds.top - photo.offsetTop, photo.offsetHeight);
  photo.style.transformOrigin = `${x}% ${y}%`;
}

const Post = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const photo = item.image?.[0];
  const inquiry = inquiryUrl(item, process.env.REACT_APP_WHATSAPP_NUMBER);
  return <article className="post-card"><button className="post-img" onPointerMove={movePhotoZoom} onClick={() => setIsOpen(true)} aria-label={`कार्ड MT. ${item.title} की तस्वीरें देखें`}>
    {photo && <>
      <img className="post-photo-backdrop" src={photo} loading="lazy" alt="" aria-hidden="true" />
      <img className="post-photo" src={photo} loading="lazy" alt={`शादी का कार्ड MT. ${item.title}`} />
    </>}<span className="image-open">तस्वीरें देखें ↗</span>
  </button><div className="post-details"><span className="product-category">विवाह निमंत्रण</span><div className="post-title"><h3>MT. {item.title}</h3><p>₹ {item.cPrice}<small> / कार्ड</small></p></div>
    <SaveCard item={item}/><a className="card-detail-link" href={item._id?`/cards/${encodeURIComponent(item._id)}`:`/enquiry?card=${encodeURIComponent(`MT. ${item.title}`)}`}>इस कार्ड की जानकारी लें ↗</a>
    {inquiry && <a className="product-inquiry" href={inquiry} target="_blank" rel="noopener noreferrer">WhatsApp पर पूछें <span>↗</span></a>}
  </div>{isOpen && <PopupCard item={item} setIsOpen={setIsOpen} />}</article>;
};
export default Post;
