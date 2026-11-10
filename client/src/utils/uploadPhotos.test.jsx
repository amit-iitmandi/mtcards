import { vi } from 'vitest';
import axios from 'axios';
import { uploadPhotos, validateImages, uploadErrorText } from './uploadPhotos';
vi.mock('axios');
vi.mock('./compressImages', async importOriginal => ({ ...await importOriginal(), preparePhotos: vi.fn(async files => files) }));

beforeEach(() => vi.resetAllMocks());

test('invalid file count and unsupported types are blocked without network traffic', () => {
  expect(() => validateImages([])).toThrow('between 1 and 12');
  expect(() => validateImages(Array.from({ length: 13 }, () => new File(['x'], 'card.jpg', { type: 'image/jpeg' })))).toThrow('between 1 and 12');
  expect(() => validateImages([new File(['<svg />'], 'card.svg', { type: 'image/svg+xml' })])).toThrow('JPG, PNG or WebP');
  expect(axios.post).not.toHaveBeenCalled();
});

test('ticket must be a same-origin backend upload path, not a remote URL', async () => {
  axios.post.mockResolvedValueOnce({ data: { uploadUrl: 'https://attacker.example/collect' } });
  const photo = new File(['x'], 'card.jpg', { type: 'image/jpeg' });
  await expect(uploadPhotos([photo], 'Bearer token')).rejects.toThrow('invalid upload ticket');
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('multiple photos are uploaded together under one signed ticket', async () => {
  const photo1 = new File(['first'], 'front.jpg', { type: 'image/jpeg' });
  const photo2 = new File(['second'], 'inside.png', { type: 'image/png' });
  const assets = [
    { id: '1'.repeat(24), url: 'https://res.cloudinary.com/demo/image/upload/front.jpg' },
    { id: '2'.repeat(24), url: 'https://res.cloudinary.com/demo/image/upload/inside.png' }
  ];
  axios.post.mockResolvedValueOnce({ data: { uploadUrl: '/admin/uploads?ticketId=' + 'a'.repeat(24) } })
    .mockResolvedValueOnce({ data: { assets } });
  await expect(uploadPhotos([photo1, photo2], 'Bearer token')).resolves.toEqual(assets);
  expect(axios.post).toHaveBeenCalledTimes(2);
  expect(axios.post.mock.calls[0][1]).toEqual({
    files: [{ mimeType: 'image/jpeg', size: photo1.size }, { mimeType: 'image/png', size: photo2.size }]
  });
  expect(axios.post.mock.calls[1][1]).toBeInstanceOf(FormData);
  expect(axios.post.mock.calls[1][2].headers).toEqual({ Authorization: 'Bearer token' });
});

test('server provider failure codes guide safe troubleshooting without exposing messages', () => {
  const auth = uploadErrorText({ response: { status: 503, data: { code: 'IMAGE_HOST_AUTH_FAILED', error: 'private upstream message' } } });
  expect(auth).toMatch(/Cloudinary rejected the server credentials/);
  expect(auth).not.toMatch(/private upstream/);
  const cloud = uploadErrorText({ response: { status: 503, data: { code: 'IMAGE_HOST_CLOUD_NOT_FOUND' } } });
  expect(cloud).toMatch(/CLOUDINARY_CLOUD_NAME/);
  const network = uploadErrorText({ response: { status: 503, data: { code: 'IMAGE_HOST_NETWORK_ERROR' } } });
  expect(network).toMatch(/could not connect/);
  expect(uploadErrorText({ response: { status: 503, data: { code: 'UNKNOWN' } } }))
    .toMatch(/temporarily unavailable/);
});

test('upload ticket and multipart describe the compressed bytes, not the originals', async () => {
  const { preparePhotos } = await import('./compressImages');
  const compressed = new File(['small'], 'card.webp', { type: 'image/webp' });
  preparePhotos.mockResolvedValueOnce([compressed]);
  const original = new File([new Uint8Array(6 * 1024 * 1024)], 'card.png', { type: 'image/png' });
  axios.post.mockResolvedValueOnce({ data: { uploadUrl: '/admin/uploads?ticketId=' + 'a'.repeat(24) } })
    .mockResolvedValueOnce({ data: { assets: [{ id: 'b'.repeat(24), url: 'https://res.cloudinary.com/demo/card.webp' }] } });
  await uploadPhotos([original], 'Bearer token');
  expect(axios.post.mock.calls[0][1]).toEqual({ files: [{ mimeType: 'image/webp', size: 5 }] });
  const uploaded = axios.post.mock.calls[1][1].get('files');
  expect(uploaded.type).toBe('image/webp');
  expect(uploaded.size).toBe(5);
});
