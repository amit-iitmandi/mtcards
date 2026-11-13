import { useRef, useState } from 'react';
import './cardPhoto.css';

export default function CardPhoto({ src, alt }) {
  const dialog = useRef(null);
  const viewport = useRef(null);
  const touchStart = useRef(null);
  const lastTap = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(1);

  function changeZoom(next) {
    setZoom(next);
    if (next === 1) viewport.current.scrollTo(0, 0);
  }

  function handleTouchEnd(event) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 350) {
      lastTap.current = null;
      return;
    }
    const previous = lastTap.current;
    const tap = { x: event.clientX, y: event.clientY, time: Date.now() };
    if (previous && tap.time - previous.time <= 350 && Math.hypot(tap.x - previous.x, tap.y - previous.y) <= 32) {
      lastTap.current = null;
      dialog.current.close();
    } else {
      lastTap.current = tap;
    }
  }

  return <>
    <button type="button" className="card-photo-trigger" aria-label={`तस्वीर बड़ी करें: ${alt}`}
      onClick={() => { lastTap.current = null; setZoom(1); dialog.current.showModal(); viewport.current.scrollTo(0, 0); }}>
      <img src={src} alt={alt} />
      <span aria-hidden="true">⤢ बड़ा देखें</span>
    </button>
    <dialog ref={dialog} className="card-photo-viewer" aria-label={alt}
      onClick={event => {
        const pointer = event.nativeEvent.pointerType;
        const mouseClick = pointer ? pointer === 'mouse' : !event.nativeEvent.sourceCapabilities?.firesTouchEvents;
        if (event.detail > 0 && mouseClick && !event.target.closest('button')) dialog.current.close();
      }}
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
      <img className="card-photo-ambient" src={src} alt="" aria-hidden="true" loading="lazy" />
      <div className="card-photo-toolbar">
        <button type="button" aria-label="छोटा करें" disabled={zoom === 1} onClick={() => changeZoom(zoom - 0.5)}>−</button>
        <button type="button" aria-label="मूल आकार" onClick={() => changeZoom(1)}>{zoom * 100}%</button>
        <button type="button" aria-label="ज़ूम बढ़ाएँ" disabled={zoom === 4} onClick={() => changeZoom(zoom + 0.5)}>+</button>
        <button type="button" aria-label="बड़ी तस्वीर बंद करें" onClick={() => dialog.current.close()}>×</button>
      </div>
      <div className="card-photo-scroll" ref={viewport} tabIndex={0} aria-label="ज़ूम की गई तस्वीर"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={event => {
          if (event.pointerType === 'touch' && event.isPrimary && event.target.tagName === 'IMG') {
            touchStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now() };
          } else if (event.pointerType === 'touch') {
            touchStart.current = null;
            lastTap.current = null;
          }
        }}
        onPointerUp={handleTouchEnd}
        onPointerCancel={() => { touchStart.current = null; lastTap.current = null; }}>
        <img src={src} alt={alt} loading="lazy" draggable={false}
          onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || 1)}
          style={{ '--photo-ratio': ratio, '--photo-zoom': zoom }} />
      </div>
    </dialog>
  </>;
}
