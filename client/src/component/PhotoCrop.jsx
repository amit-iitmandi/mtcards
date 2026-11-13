import { useEffect, useRef, useState } from 'react';
import './photoCrop.css';

const fullPhoto = { left: 0, top: 0, right: 1, bottom: 1 };
function rotateSelection({ left, top, right, bottom }, rotation) {
  switch (rotation) {
    case 90: return { left: 1 - bottom, top: left, right: 1 - top, bottom: right };
    case 180: return { left: 1 - right, top: 1 - bottom, right: 1 - left, bottom: 1 - top };
    case 270: return { left: top, top: 1 - right, right: bottom, bottom: 1 - left };
    default: return { left, top, right, bottom };
  }
}

const edges = ['left', 'top', 'right', 'bottom'];

export default function PhotoCrop({ photo, onCancel, onApply }) {
  const dialog = useRef(null);
  const image = useRef(null);
  const start = useRef(null);
  const stage = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState(fullPhoto);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sideways = rotation % 180 !== 0;
  const sourceRatio = ready ? image.current.naturalWidth / image.current.naturalHeight : 1;
  const previewRatio = sideways ? 1 / sourceRatio : sourceRatio;

  function rotate(direction) {
    start.current = null;
    setRotation((rotation + direction + 360) % 360);
    // Keep the selected part of the photo as it turns.
    if (crop !== fullPhoto) setCrop(rotateSelection(crop, direction === 90 ? 90 : 270));
  }

  useEffect(() => {
    const element = dialog.current;
    if (typeof element.showModal === 'function') {
      element.showModal();
      return () => element.close();
    }
    element.setAttribute('open', '');
  }, []);

  function point(event) {
    const bounds = stage.current.getBoundingClientRect();
    const clamp = value => Math.min(1, Math.max(0, value));
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height)
    };
  }

  function updateSelection(event) {
    if (start.current?.id !== event.pointerId) return;
    const from = start.current;
    const to = point(event);
    if (Math.abs(from.x - to.x) < 0.02 || Math.abs(from.y - to.y) < 0.02) return;
    setCrop({
      left: Math.min(from.x, to.x), top: Math.min(from.y, to.y),
      right: Math.max(from.x, to.x), bottom: Math.max(from.y, to.y)
    });
  }

  async function applyCrop() {
    if (crop === fullPhoto && rotation === 0) { onCancel(); return; }
    setSaving(true);
    setError('');
    const source = image.current;
    const canvas = document.createElement('canvas');
    try {
      const selection = rotateSelection(crop, (360 - rotation) % 360);
      const x = Math.min(source.naturalWidth - 1, Math.round(selection.left * source.naturalWidth));
      const y = Math.min(source.naturalHeight - 1, Math.round(selection.top * source.naturalHeight));
      const width = Math.max(1, Math.round(selection.right * source.naturalWidth) - x);
      const height = Math.max(1, Math.round(selection.bottom * source.naturalHeight) - y);
      const scale = Math.min(1, 2400 / Math.max(width, height));
      const outputWidth = Math.max(1, Math.round(width * scale));
      const outputHeight = Math.max(1, Math.round(height * scale));
      canvas.width = sideways ? outputHeight : outputWidth;
      canvas.height = sideways ? outputWidth : outputHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cropping is unavailable in this browser.');
      context.imageSmoothingQuality = 'high';
      if (rotation) {
        context.translate(rotation === 90 || rotation === 180 ? canvas.width : 0,
          rotation === 180 || rotation === 270 ? canvas.height : 0);
        context.rotate(rotation * Math.PI / 180);
      }
      context.drawImage(source, x, y, width, height, 0, 0, outputWidth, outputHeight);
      const type = photo.file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.97));
      if (!blob) throw new Error('Could not save this crop.');
      const extension = blob.type === 'image/jpeg' ? 'jpg' : 'png';
      onApply(new File([blob], photo.name.replace(/\.[^.]*$/, '') + '.' + extension, { type: blob.type }));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  return <dialog ref={dialog} className="photo-crop" aria-labelledby="photo-crop-title"
    onCancel={event => { event.preventDefault(); if (!saving) onCancel(); }}>
    <h2 id="photo-crop-title">Crop photo</h2>
    <p>Drag across the photo to select the area you want to keep. Any aspect ratio works.</p>
    <div className="photo-crop-actions photo-crop-rotation" role="group" aria-label="Rotate photo">
      <button type="button" className="workspace-secondary" disabled={!ready || saving} onClick={() => rotate(-90)}>↶ Rotate left</button>
      <button type="button" className="workspace-secondary" disabled={!ready || saving} onClick={() => rotate(90)}>↷ Rotate right</button>
    </div>
    <div ref={stage} className="photo-crop-stage"
      style={ready ? { width: `min(100%, ${45 * previewRatio}dvh, ${sideways ? image.current.naturalHeight : image.current.naturalWidth}px)`, aspectRatio: previewRatio } : undefined}
      onPointerDown={event => {
        if (!ready || saving || !event.isPrimary || event.button !== 0) return;
        start.current = { ...point(event), id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={updateSelection}
      onPointerUp={event => { updateSelection(event); start.current = null; }}
      onLostPointerCapture={() => { start.current = null; }}>
      <img ref={image} src={photo.url} alt={photo.name} draggable={false}
        style={ready ? { position: 'absolute', top: '50%', left: '50%', maxWidth: 'none', maxHeight: 'none',
          width: sideways ? `${100 / previewRatio}%` : '100%', transform: `translate(-50%, -50%) rotate(${rotation}deg)` } : undefined}
        onLoad={() => setReady(true)} onError={() => setError('Could not open this photo.')} />
      {ready && <div className="photo-crop-selection" aria-hidden="true" style={{
        left: crop.left * 100 + '%', top: crop.top * 100 + '%',
        right: (1 - crop.right) * 100 + '%', bottom: (1 - crop.bottom) * 100 + '%'
      }} />}
    </div>
    <div className="photo-crop-edges" aria-label="Crop edges" role="group">
      {edges.map(edge => {
        const leading = edge === 'left' || edge === 'top';
        const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[edge];
        return <label key={edge}>{edge}
          <input type="range" aria-label={edge + ' crop edge'} min={leading ? 0 : Math.ceil(crop[opposite] * 100) + 1}
            max={leading ? Math.floor(crop[opposite] * 100) - 1 : 100}
            value={Math.round(crop[edge] * 100)} disabled={!ready || saving}
            onChange={event => setCrop({ ...crop, [edge]: Number(event.target.value) / 100 })} />
        </label>;
      })}
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="photo-crop-actions">
      <button type="button" className="workspace-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
      <button type="button" className="workspace-secondary" disabled={!ready || saving} onClick={() => setCrop(fullPhoto)}>Reset selection</button>
      <button type="button" className="workspace-primary" disabled={!ready || saving} onClick={applyCrop}>{saving ? 'Applying…' : rotation ? 'Apply changes' : 'Apply crop'}</button>
    </div>
  </dialog>;
}
