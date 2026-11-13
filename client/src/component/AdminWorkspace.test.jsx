import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminWorkspace from './AdminWorkspace';
import CardEditor from './CardEditor';
import EnquiryPage from './EnquiryPage';
vi.mock('axios');
vi.mock('../utils/compressImages', async importOriginal => ({ ...await importOriginal(), preparePhotos: vi.fn(async files => files) }));
const item = {
  _id: 'abc123',
  title: '108',
  image: ['https://example.com/card.jpg'],
  cPrice: '20',
  sPrice: '15',
  stock: 0,
  type1: 'Hindu Wedding Card',
  type2: 'Single Card'
};
const props = {
  type1: [{
    name: 'Hindu Wedding Card'
  }],
  type2: [{
    name: 'Single Card'
  }]
};
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('token', JSON.stringify({
    data: {
      token: 'Bearer test'
    }
  }));
  axios.get.mockImplementation(url => Promise.resolve({
    data: url.endsWith('/admin/session') ? {} : { total: 2, items: [item, { ...item,
      _id: 'second',
      title: '205',
      stock: 12
    }] }
  }));
});

function workspace(path = '/admin/cards') {
  return render(<MemoryRouter initialEntries={[path]}><AdminWorkspace {...props} /></MemoryRouter>);
}

test('stock filters and search use catalogue data without refetching', async () => {
  workspace('/admin/stock');
  await screen.findByText('MT. 108');
  fireEvent.change(screen.getByLabelText('Stock filter'), {
    target: {
      value: 'out'
    }
  });
  expect(screen.queryByText('MT. 205')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search cards'), {
    target: {
      value: '205'
    }
  });
  expect(screen.getByText('No cards found')).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledTimes(2);
});
test('archive waits for confirmation and stays hidden after the library reloads', async () => {
  axios.delete.mockResolvedValue({
    data: {
      success: true, archived: true
    }
  });
  const view = workspace();
  await screen.findByText('MT. 108');
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Archive'
  })[0]);
  expect(axios.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {
    name: 'Keep card'
  }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Archive'
  })[0]);
  fireEvent.click(screen.getByRole('button', {
    name: 'Archive card'
  }));
  await waitFor(() => expect(screen.queryByText('MT. 108')).not.toBeInTheDocument());
  expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/deletePost/abc123'), {
    headers: {
      Authorization: 'Bearer test'
    },
    timeout: 15000
  });
  view.unmount();
  axios.get.mockImplementation(async url => ({
    data: url.endsWith('/admin/session') ? {} : {
      total: 2,
      items: [{ ...item, status: 'archived' }, { ...item, _id: 'second', title: '205', status: 'draft' }]
    }
  }));
  workspace();
  await screen.findByText('MT. 205');
  expect(screen.queryByText('MT. 108')).not.toBeInTheDocument();
});
test('failed archive keeps card and shows retryable error', async () => {
  axios.delete.mockRejectedValue(new Error('offline'));
  workspace();
  await screen.findByText('MT. 108');
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Archive'
  })[0]);
  fireEvent.click(screen.getByRole('button', {
    name: 'Archive card'
  }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be archived');
  expect(screen.getByText('MT. 108')).toBeInTheDocument();
});
test('editing a legacy card saves changed details with its version and refreshes the library', async () => {
  axios.patch.mockResolvedValue({ data: { card: { ...item, title: '109', version: 1, addedYear: null } } });
  const { container } = workspace('/admin/cards/abc123/edit');
  await screen.findByLabelText('Card code');
  expect(screen.getByLabelText('Card added year')).not.toBeRequired();
  expect(screen.getByLabelText('Recorded stock')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Card code'), { target: { value: '109' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save session draft' }));
  expect(screen.getByRole('status')).toHaveTextContent('live card has not changed');
  expect(axios.patch).not.toHaveBeenCalled();

  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByText('Card changes saved.')).toBeInTheDocument();
  expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining('/admin/cards/abc123'),
    { title: '109', expectedVersion: 0 },
    expect.objectContaining({ headers: { Authorization: 'Bearer test' } }));
  expect(sessionStorage.getItem('mtcards:card-draft:abc123')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: /Back to card library/ }));
  expect(screen.getByText('MT. 109')).toBeInTheDocument();
});

test('a version conflict keeps the edit visible and asks the admin to refresh', async () => {
  axios.patch.mockRejectedValue({ response: { status: 409 } });
  const { container } = workspace('/admin/cards/abc123/edit');
  fireEvent.change(await screen.findByLabelText('Card code'), { target: { value: '109' } });
  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Refresh the page');
  expect(screen.getByLabelText('Card code')).toHaveValue('109');
});

test('new card signs photos, uploads to the API and saves managed image IDs', async () => {
  const cleanup = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  const onCreated = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:card-preview');
  URL.revokeObjectURL = vi.fn();
  const assetId = 'b'.repeat(24);
  axios.post.mockResolvedValueOnce({
    data: { uploadUrl: '/admin/uploads?ticketId=' + 'a'.repeat(24) }
  }).mockResolvedValueOnce({
    data: { assets: [{ id: assetId, url: 'https://res.cloudinary.com/demo/image/upload/card.jpg' }] }
  }).mockResolvedValueOnce({ data: { card: item } });
  const { container } = render(<MemoryRouter><CardEditor {...props} onCreated={onCreated} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Card code'), { target: { value: '108' } });
  fireEvent.change(screen.getByLabelText('Recorded stock'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Customer price · ₹'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Selling price · ₹'), { target: { value: '15' } });
  const photo = new File(['jpeg'], 'card.jpg', { type: 'image/jpeg' });
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [photo] } });
  fireEvent.submit(container.querySelector('form'));
  await waitFor(() => expect(screen.getByText(/Card created in the catalogue/)).toBeInTheDocument());
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/admin/uploads/sign'), {
    files: [{ mimeType: 'image/jpeg', size: photo.size }]
  }, expect.objectContaining({ headers: { Authorization: 'Bearer test' } }));
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/admin/cards'),
    expect.objectContaining({ title: '108', addedYear: Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date())), imageAssetIds: [assetId], status: 'published' }),
    expect.objectContaining({ headers: { Authorization: 'Bearer test' } }));
  expect(axios.post.mock.calls[1][1]).toBeInstanceOf(FormData);
  expect(axios.post).toHaveBeenCalledTimes(3);
  expect(onCreated).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: 'View card library' })).toHaveAttribute('href', '/admin/cards');
  fireEvent.click(screen.getByRole('button', { name: 'Add another card' }));
  expect(screen.getByLabelText('Card code')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Create card' })).toBeEnabled();
  expect(axios.post).toHaveBeenCalledTimes(3);
  cleanup.mockRestore();
});

test('invalid photo is rejected before any network request', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:bad-preview');
  const { container } = render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
  const photo = new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' });
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [photo] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG or WebP');
  expect(axios.post).not.toHaveBeenCalled();
});

test('backend upload outage preserves photo selection and entered details', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:outage-preview');
  URL.revokeObjectURL = vi.fn();
  axios.post.mockRejectedValueOnce({ response: { status: 503 } });
  const { container } = render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Card code'), { target: { value: '250' } });
  fireEvent.change(screen.getByLabelText('Recorded stock'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Customer price · ₹'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Selling price · ₹'), { target: { value: '15' } });
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File(['x'], 'card.jpg', { type: 'image/jpeg' })] } });
  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('not configured');
  expect(screen.getByLabelText('Card code')).toHaveValue('250');
  expect(screen.getByAltText('card.jpg')).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('stock failure cannot create a second card and can safely retry same adjustment', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:stock-preview');
  URL.revokeObjectURL = vi.fn();
  const assetId = 'b'.repeat(24);
  axios.post.mockResolvedValueOnce({ data: { uploadUrl: '/admin/uploads?ticketId=' + 'a'.repeat(24) } })
    .mockResolvedValueOnce({ data: { assets: [{ id: assetId, url: 'https://res.cloudinary.com/demo/image/upload/card.jpg' }] } })
    .mockResolvedValueOnce({ data: { card: item } })
    .mockRejectedValueOnce(new Error('connection lost'))
    .mockResolvedValueOnce({ data: { inventory: { onHand: 5 } } });
  const { container } = render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Card code'), { target: { value: '108' } });
  fireEvent.change(screen.getByLabelText('Recorded stock'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Customer price · ₹'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Selling price · ₹'), { target: { value: '15' } });
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File(['x'], 'card.jpg', { type: 'image/jpeg' })] } });
  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('stock is not confirmed');
  const before = axios.post.mock.calls[3][1];
  expect(screen.getByRole('button', { name: 'Card saved · stock pending' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry stock update' }));
  await waitFor(() => expect(screen.getByText(/Card created in the catalogue/)).toBeInTheDocument());
  expect(axios.post.mock.calls[4][1]).toEqual(before);
  expect(axios.post).toHaveBeenCalledTimes(5);
});
test('enquiry has no form or card number field', () => {
  render(<MemoryRouter initialEntries={['/enquiry?card=MT.%20108']}><EnquiryPage navigate={() => {}} /></MemoryRouter>);
  expect(screen.queryByLabelText('कार्ड का कोड')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});

test('camera photos can be cropped at a free aspect ratio before upload', async () => {
  URL.createObjectURL = vi.fn(file => 'blob:' + file.name + ':' + file.size);
  URL.revokeObjectURL = vi.fn();
  const drawImage = vi.fn();
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
    callback(new Blob(['cropped jpeg'], { type: 'image/jpeg' }));
  });
  try {
    render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
    const camera = screen.getByLabelText('Take a photo');
    expect(camera).toHaveAttribute('capture', 'environment');
    const file = new File(['original'], 'camera.jpg', { type: 'image/jpeg' });
    fireEvent.change(camera, { target: { files: [file] } });
    const dialog = screen.getByRole('dialog', { name: 'Crop photo' });
    const photo = dialog.querySelector('img');
    Object.defineProperties(photo, { naturalWidth: { value: 1000 }, naturalHeight: { value: 800 } });
    fireEvent.load(photo);
    fireEvent.change(screen.getByLabelText('left crop edge'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('bottom crop edge'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply crop' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(drawImage).toHaveBeenCalledWith(photo, 100, 0, 900, 400, 0, 0, 900, 400);
    expect(screen.getByAltText('Invitation preview')).toHaveAttribute('src', 'blob:camera.jpg:12');
  } finally {
    context.mockRestore();
    encode.mockRestore();
  }
});

test('rotating after selecting a crop preserves the selected pixels', async () => {
  URL.createObjectURL = vi.fn(file => 'blob:' + file.name + ':' + file.size);
  URL.revokeObjectURL = vi.fn();
  const drawImage = vi.fn(), translate = vi.fn(), rotate = vi.fn();
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, translate, rotate });
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
    callback(new Blob(['cropped jpeg'], { type: 'image/jpeg' }));
  });
  try {
    render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
    const camera = screen.getByLabelText('Take a photo');
    expect(camera).toHaveAttribute('capture', 'environment');
    const file = new File(['original'], 'camera.jpg', { type: 'image/jpeg' });
    fireEvent.change(camera, { target: { files: [file] } });
    const dialog = screen.getByRole('dialog', { name: 'Crop photo' });
    const photo = dialog.querySelector('img');
    Object.defineProperties(photo, { naturalWidth: { value: 1000 }, naturalHeight: { value: 800 } });
    fireEvent.load(photo);
    fireEvent.change(screen.getByLabelText('left crop edge'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('bottom crop edge'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Rotate right/ }));
    expect(photo.style.transform).toContain('rotate(90deg)');
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(translate).toHaveBeenCalledWith(400, 0);
    expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(drawImage).toHaveBeenCalledWith(photo, 100, 0, 900, 400, 0, 0, 900, 400);
    expect(screen.getByAltText('Invitation preview')).toHaveAttribute('src', 'blob:camera.jpg:12');
  } finally {
    context.mockRestore();
    encode.mockRestore();
  }
});
