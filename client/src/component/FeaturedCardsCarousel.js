import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalogueCards } from '../utils/catalogue';
import { cardCode, inquiryUrl } from '../utils/inquiry';
import './featuredCarousel.css';

export default function FeaturedCardsCarousel({ fallback = null }) {
  const { posts, loading, error } = useCatalogueCards();
  const track = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cards = posts
    .filter(item => (!item.status || item.status === 'published') && Array.isArray(item.image) && typeof item.image[0] === 'string' && item.image[0].trim())
    .slice(0, 10);

  // Keep the wedding photograph in place when no live product images are available.
  if (loading || error || cards.length === 0) return fallback;

  const goTo = index => {
    const next = (index + cards.length) % cards.length;
    setActiveIndex(next);
    if (track.current && typeof track.current.scrollTo === 'function') {
      track.current.scrollTo({ left: next * track.current.clientWidth, behavior: 'smooth' });
    }
  };

  const onScroll = event => {
    const element = event.currentTarget;
    if (element.clientWidth) {
      setActiveIndex(Math.min(cards.length - 1, Math.max(0, Math.round(element.scrollLeft / element.clientWidth))));
    }
  };

  return <section className="featured-carousel" aria-label="चुनिंदा शादी के कार्ड">
    <div className="featured-carousel-heading"><span>OUR CARD COLLECTION</span><strong>कार्ड चुनें, सीधे बात करें</strong></div>
    <div className="featured-carousel-track" ref={track} onScroll={onScroll} role="region" aria-roledescription="carousel" aria-label="शादी के कार्ड की तस्वीरें" tabIndex={0}>
      {cards.map((item, index) => {
        const code = cardCode(item);
        const whatsapp = inquiryUrl(item, process.env.REACT_APP_WHATSAPP_NUMBER);
        const href = whatsapp || `/enquiry?card=${encodeURIComponent(code)}`;
        return <article className="featured-slide" key={item._id || `${code}-${index}`} aria-label={`${index + 1} / ${cards.length}: ${code}`}>
          <a className="featured-slide-link" href={href} target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noopener noreferrer' : undefined} aria-label={whatsapp ? `${code} के लिए WhatsApp पर पूछें` : `${code} के लिए पूछताछ करें`}>
            <span className="featured-image-wrap"><img src={item.image[0]} alt={`विवाह निमंत्रण ${code}`} loading={index === 0 ? 'eager' : 'lazy'} /><span className="featured-image-badge">असली कार्ड डिज़ाइन</span></span>
            <span className="featured-slide-meta"><span><small>{item.type1 || 'विवाह निमंत्रण'}</small><strong>{code}</strong></span><span className="featured-slide-price">{item.sPrice ? `₹${item.sPrice}` : 'कीमत पूछें'}<small>{item.sPrice ? 'प्रति कार्ड · विवरण पूछें' : 'दुकान से जानकारी लें'}</small></span></span>
            <span className="featured-slide-action">{whatsapp ? 'WhatsApp पर जानकारी लें' : 'कार्ड की जानकारी लें'} <span aria-hidden="true">↗</span></span>
          </a>
        </article>;
      })}
    </div>
    <div className="featured-carousel-footer"><div className="featured-carousel-controls">
      <button type="button" aria-label="पिछला कार्ड" onClick={() => goTo(activeIndex - 1)} disabled={cards.length < 2}>←</button>
      <span aria-live="polite">{String(activeIndex + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}</span>
      <button type="button" aria-label="अगला कार्ड" onClick={() => goTo(activeIndex + 1)} disabled={cards.length < 2}>→</button>
    </div><Link to="/catalogue" className="featured-all-link">सभी कार्ड देखें ↗</Link></div>
  </section>;
}
