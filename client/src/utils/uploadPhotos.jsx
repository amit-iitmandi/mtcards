import axios from 'axios';
import { apiUrl } from './api';
import { preparePhotos } from './compressImages';

export const IMAGE_LIMITS = {
  maxFiles: 12,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 25 * 1024 * 1024
};
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateImages(files) {
  if (!files.length || files.length > IMAGE_LIMITS.maxFiles) {
    throw new Error('Choose between 1 and 12 photos.');
  }
  if (files.some(file => !allowedTypes.has(file.type) || file.size < 1 || file.size > IMAGE_LIMITS.maxFileBytes)) {
    throw new Error('Each photo must be JPG, PNG or WebP and no larger than 5 MB.');
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > IMAGE_LIMITS.maxTotalBytes) {
    throw new Error('All photos together must be 25 MB or less.');
  }
}

export function adminToken() {
  try {
    const token = JSON.parse(sessionStorage.getItem('token'))?.data?.token;
    return typeof token === 'string' && /^Bearer [^\s]+$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export async function uploadPhotos(originals, token, onProgress) {
  if (!token) throw new Error('Your session expired. Please log in again.');
  const files = await preparePhotos(originals, onProgress);
  validateImages(files);
  const auth = { Authorization: token };
  const { data: ticket } = await axios.post(apiUrl('/admin/uploads/sign'), {
    files: files.map(file => ({ mimeType: file.type, size: file.size }))
  }, { headers: auth, timeout: 15000 });
  // Never forward an admin bearer token to a URL supplied by a remote response.
  if (typeof ticket?.uploadUrl !== 'string' ||
    !/^\/admin\/uploads\?ticketId=[a-f0-9]{24}$/i.test(ticket.uploadUrl)) {
    throw new Error('The upload service returned an invalid upload ticket.');
  }
  const form = new FormData();
  files.forEach(file => form.append('files', file, file.name));
  const { data } = await axios.post(apiUrl(ticket.uploadUrl), form, {
    headers: auth,
    timeout: 120000
  });
  if (!Array.isArray(data?.assets) || data.assets.length !== files.length ||
      data.assets.some(asset => !/^[a-f0-9]{24}$/i.test(asset?.id || '') ||
        typeof asset.url !== 'string' || !asset.url.startsWith('https://res.cloudinary.com/'))) {
    throw new Error('Image storage did not confirm all uploaded photos.');
  }
  return data.assets;
}

export async function releasePhotos(assets, token) {
  if (!token) return;
  await Promise.allSettled(assets.map(asset =>
    axios.delete(apiUrl('/admin/uploads/' + encodeURIComponent(asset.id)), {
      headers: { Authorization: token }, timeout: 15000
    })
  ));
}

export function uploadErrorText(error) {
  if (error?.response?.status === 401) return 'Your session expired. Sign in again, then retry.';
  if (error?.response?.status === 403) return 'Your account does not have permission to upload cards.';
  if (error?.response?.status === 413 || error?.response?.status === 415 || error?.response?.status === 422) {
    return error?.response?.data?.error || 'These photos were rejected. Choose JPG, PNG or WebP files within the size limit.';
  }
  if (error?.response?.status === 503) {
    switch (error?.response?.data?.code) {
      case 'IMAGE_HOST_AUTH_FAILED':
        return 'Cloudinary rejected the server credentials. Please check the Cloudinary cloud name, API key and API secret in Render, then retry.';
      case 'IMAGE_HOST_CLOUD_NOT_FOUND':
        return 'Cloudinary could not find the configured cloud. Check CLOUDINARY_CLOUD_NAME in Render.';
      case 'IMAGE_HOST_FILE_REJECTED':
        return 'Cloudinary rejected this image. Try a smaller JPG, PNG or WebP file.';
      case 'IMAGE_HOST_RATE_LIMITED':
        return 'Cloudinary is temporarily rate limiting uploads. Please retry later.';
      case 'IMAGE_HOST_NETWORK_ERROR':
        return 'The backend could not connect to Cloudinary. Please retry.';
      case 'IMAGE_HOST_UPLOAD_FAILED':
        return 'Cloudinary rejected the image upload. Please contact the administrator with the request ID.';
      default:
        return 'Secure image storage is not configured or is temporarily unavailable on the backend.';
    }
  }
  if (error?.response?.status === 404 || error?.response?.status === 405 ||
      error?.response?.data?.code === 'SIGNED_UPLOAD_REQUIRED') {
    return 'The backend image-upload update has not been deployed yet. Your card details are still here.';
  }
  return error?.message && !error.response ? error.message : 'Upload failed. Your selected photos and card details are still here.';
}
