import { vi } from 'vitest';
import { compressImage, preparePhotos, validateSourceImages } from './compressImages';

let bitmap, context, canvas, encode;
beforeEach(() => {
  bitmap = { width: 4000, height: 3000, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
  context = { drawImage: vi.fn() };
  encode = vi.fn(callback => callback(new Blob(['compressed-photo'], { type: 'image/jpeg' })));
  canvas = { width: 0, height: 0, getContext: () => context, toBlob: encode };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const photo = (size = 1000, type = 'image/jpeg') => new File([new Uint8Array(size)], 'card.png', { type });

test('resizes phone photos, preserves aspect ratio, releases decoded pixels and declares actual MIME', async () => {
  const result = await compressImage(photo());
  expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2400, 1800);
  expect(result.type).toBe('image/jpeg');
  expect(result.name).toBe('card.jpg');
  expect(result.size).toBe(16);
  expect(bitmap.close).toHaveBeenCalledOnce();
  expect(canvas.width).toBe(0);
});
test('does not enlarge small photos or replace them with larger encodings', async () => {
  bitmap.width = 100; bitmap.height = 200;
  const original = photo(5);
  expect(await compressImage(original)).toBe(original);
  expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 100, 200);
});
test('PNG requests transparency-capable WebP and uses actual fallback PNG type', async () => {
  encode.mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  const result = await compressImage(photo(1000, 'image/png'));
  expect(encode).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
  expect(result.type).toBe('image/png');
});
test('quality is reduced only when needed and larger candidates are ignored', async () => {
  encode.mockImplementationOnce(cb => cb(new Blob([new Uint8Array(2000000)], { type: 'image/jpeg' })))
    .mockImplementationOnce(cb => cb(new Blob([new Uint8Array(2100000)], { type: 'image/jpeg' })))
    .mockImplementationOnce(cb => cb(new Blob([new Uint8Array(1000000)], { type: 'image/jpeg' })));
  expect((await compressImage(photo())).size).toBe(1000000);
  expect(encode.mock.calls.map(call => call[2])).toEqual([0.9, 0.82, 0.74]);
});
test('rejects corrupt and oversized-dimension photos and releases resources on failure', async () => {
  bitmap.width = 10000; bitmap.height = 10000;
  await expect(compressImage(photo())).rejects.toThrow('40 megapixels');
  expect(bitmap.close).toHaveBeenCalledOnce();
  createImageBitmap.mockRejectedValueOnce(new Error('Invalid image'));
  await expect(compressImage(photo())).rejects.toThrow('card.png: Invalid image');
});
test('input limits reject unsupported types and huge selections before decode', async () => {
  expect(() => validateSourceImages([photo(1, 'image/svg+xml')])).toThrow('JPG, PNG or WebP');
  expect(() => validateSourceImages([photo(0)])).toThrow();
  expect(() => validateSourceImages([{ type: 'image/jpeg', size: 21 * 1024 * 1024 }])).toThrow('20 MB');
  expect(() => validateSourceImages(Array(6).fill({ type: 'image/jpeg', size: 20 * 1024 * 1024 }))).toThrow('100 MB');
  await expect(preparePhotos([])).rejects.toThrow('between 1 and 12');
  expect(createImageBitmap).not.toHaveBeenCalled();
});
test('prepares batches sequentially and reports size reduction', async () => {
  const progress = vi.fn();
  const result = await preparePhotos([photo(), photo()], progress);
  expect(result).toHaveLength(2);
  expect(progress.mock.calls[0][0]).toContain('1 of 2');
  expect(progress.mock.calls[1][0]).toContain('2 of 2');
  expect(progress.mock.calls[2][0]).toContain('98% smaller');
});
