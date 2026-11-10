const MB = 1024 * 1024;
const types = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const PHOTO_INPUT_LIMITS = { maxFiles: 12, maxFileBytes: 20 * MB, maxTotalBytes: 100 * MB };

export function validateSourceImages(files) {
  if (!files.length || files.length > PHOTO_INPUT_LIMITS.maxFiles) throw new Error('Choose between 1 and 12 photos.');
  if (files.some(file => !types.has(file.type) || file.size < 1 || file.size > PHOTO_INPUT_LIMITS.maxFileBytes)) {
    throw new Error('Choose JPG, PNG or WebP photos, up to 20 MB each before compression.');
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > PHOTO_INPUT_LIMITS.maxTotalBytes) {
    throw new Error('Select up to 100 MB of original photos at a time.');
  }
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not read this photo.'));
      image.src = url;
    });
    return image;
  } finally { URL.revokeObjectURL(url); }
}

function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Your browser could not compress this photo.'));
  }, type, quality));
}

export async function compressImage(file) {
  let image;
  let canvas;
  try {
    image = await decode(file);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height || width * height > 40000000) throw new Error('Choose photos of 40 megapixels or less.');
    const scale = Math.min(1, 2400 / Math.max(width, height));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is unavailable in this browser.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // WebP preserves transparent PNG backgrounds; JPEG stays JPEG.
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    let blob = await encode(canvas, type, 0.9);
    for (const quality of [0.82, 0.74]) {
      if (blob.size <= 1.5 * MB) break;
      const next = await encode(canvas, type, quality);
      if (next.size < blob.size) blob = next;
    }
    if (scale === 1 && file.size <= blob.size) return file;
    if (!types.has(blob.type) || blob.size > 5 * MB) throw new Error('This photo is still too large. Choose a smaller photo.');
    const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.' + extension, { type: blob.type, lastModified: file.lastModified });
  } catch (err) {
    throw new Error(file.name + ': ' + (err?.message || 'Could not prepare this photo.'));
  } finally {
    image?.close?.();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

export async function preparePhotos(files, onProgress = () => {}) {
  validateSourceImages(files);
  const prepared = [];
  // Sequential processing limits memory use on phones.
  for (const file of files) {
    onProgress(`Optimizing photo ${prepared.length + 1} of ${files.length}…`);
    prepared.push(await compressImage(file));
  }
  const before = files.reduce((sum, file) => sum + file.size, 0);
  const after = prepared.reduce((sum, file) => sum + file.size, 0);
  const saved = Math.max(0, Math.round((1 - after / before) * 100));
  onProgress(`Uploading photos: ${(before / MB).toFixed(2)} MB → ${(after / MB).toFixed(2)} MB${saved ? ` (${saved}% smaller)` : ''}…`);
  return prepared;
}
