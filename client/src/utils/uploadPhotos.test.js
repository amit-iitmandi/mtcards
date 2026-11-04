import axios from 'axios';
import { uploadPhotos, validateImages, uploadErrorText } from './uploadPhotos';
jest.mock('axios');

beforeEach(() => jest.clearAllMocks());

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
