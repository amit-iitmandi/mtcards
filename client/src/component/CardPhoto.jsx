import { useRef, useState } from 'react';
import './cardPhoto.css';

export default function CardPhoto({ src, alt }) {
  const dialog = useRef(null);
  const viewport = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(1);

  function changeZoom(next) {
    setZoom(next);
    if (next === 1) viewport.current.scrollTo(0, 0);
  }

  return <>
    <button type="button" className="card-photo-trigger" aria-label={`तस्वीर बड़ी करें: ${alt}`}
      onClick={() => { setZoom(1); dialog.current.showModal(); }}>
      <img src={src} alt={alt} />
      <span aria-hidden="true">⤢ बड़ा देखें</span>
    </button>
    <dialog ref={dialog} className="card-photo-viewer" aria-label={alt}
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
      <div className="card-photo-toolbar">
        <button type="button" aria-label="छोटा करें" disabled={zoom === 1} onClick={() => changeZoom(zoom - 0.5)}>−</button>
        <button type="button" aria-label="मूल आकार" onClick={() => changeZoom(1)}>{zoom * 100}%</button>
        <button type="button" aria-label="ज़ूम बढ़ाएँ" disabled={zoom === 4} onClick={() => changeZoom(zoom + 0.5)}>+</button>
        <button type="button" aria-label="बड़ी तस्वीर बंद करें" onClick={() => dialog.current.close()}>×</button>
      </div>
      <div className="card-photo-scroll" ref={viewport} tabIndex={0} aria-label="ज़ूम की गई तस्वीर">
        <img src={src} alt={alt} loading="lazy" draggable={false}
          onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || 1)}
          style={{ '--photo-ratio': ratio, '--photo-zoom': zoom }} />
      </div>
    </dialog>
  </>;
}
