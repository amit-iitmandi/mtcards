import { useRef, useState } from 'react';
import './cardPhoto.css';

export default function CardPhoto({ images, index, onSelect, alt }) {
  const src = images[index];
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

  function movePhoto(direction) {
    lastTap.current = null;
    setRatio(1);
    changeZoom(1);
    onSelect((index + direction + images.length) % images.length);
  }

  function handleTouchEnd(event) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || Date.now() - start.time > 350) {
      lastTap.current = null;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (zoom === 1 && images.length > 1 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        movePhoto(dx < 0 ? 1 : -1);
      }
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
      onKeyDown={event => {
        if (event.key === 'Escape') event.stopPropagation();
        if (images.length > 1 && zoom === 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
      <img className="card-photo-ambient" src={src} alt="" aria-hidden="true" loading="lazy" />
      <div className="card-photo-toolbar">
        {images.length > 1 && <div className="card-photo-navigation">
          <button type="button" aria-label="बड़ी पिछली तस्वीर" onClick={() => movePhoto(-1)}>←</button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" aria-label="बड़ी अगली तस्वीर" onClick={() => movePhoto(1)}>→</button>
        </div>}
        <button type="button" aria-label="छोटा करें" disabled={zoom === 1} onClick={() => changeZoom(zoom - 0.5)}>−</button>
        <button type="button" aria-label="मूल आकार" onClick={() => changeZoom(1)}>{zoom * 100}%</button>
        <button type="button" aria-label="ज़ूम बढ़ाएँ" disabled={zoom === 4} onClick={() => changeZoom(zoom + 0.5)}>+</button>
        <button type="button" aria-label="बड़ी तस्वीर बंद करें" onClick={() => dialog.current.close()}>×</button>
      </div>
      <div className="card-photo-scroll" ref={viewport} tabIndex={0} aria-label="ज़ूम की गई तस्वीर"
        style={{ touchAction: zoom === 1 ? 'pan-y pinch-zoom' : 'manipulation' }}
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
        <img key={src} src={src} alt={alt} loading="lazy" draggable={false}
          onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || 1)}
          style={{ '--photo-ratio': ratio, '--photo-zoom': zoom }} />
      </div>
    </dialog>
  </>;
}
