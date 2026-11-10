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
test('delete waits for confirmation and successful server response', async () => {
  axios.delete.mockResolvedValue({
    data: {
      success: true
    }
  });
  workspace();
  await screen.findByText('MT. 108');
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Delete'
  })[0]);
  expect(axios.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {
    name: 'Keep card'
  }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Delete'
  })[0]);
  fireEvent.click(screen.getByRole('button', {
    name: 'Delete permanently'
  }));
  await waitFor(() => expect(screen.queryByText('MT. 108')).not.toBeInTheDocument());
  expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/deletePost/abc123'), {
    headers: {
      Authorization: 'Bearer test'
    },
    timeout: 15000
  });
});
test('failed deletion keeps card and shows retryable error', async () => {
  axios.delete.mockRejectedValue(new Error('offline'));
  workspace();
  await screen.findByText('MT. 108');
  fireEvent.click(screen.getAllByRole('button', {
    name: 'Delete'
  })[0]);
  fireEvent.click(screen.getByRole('button', {
    name: 'Delete permanently'
  }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be deleted');
  expect(screen.getByText('MT. 108')).toBeInTheDocument();
});
test('edit drafts are local only and publishing is disabled', () => {
  render(<MemoryRouter><CardEditor {...props} editing item={item} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Card code'), {
    target: {
      value: '109'
    }
  });
  fireEvent.click(screen.getByRole('button', {
    name: 'Save session draft'
  }));
  expect(screen.getByRole('status')).toHaveTextContent('live card has not changed');
  expect(JSON.parse(sessionStorage.getItem('mtcards:card-draft:abc123')).title).toBe('109');
  expect(screen.getByRole('button', {
    name: 'Publish changes · pending'
  })).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled();
});
test('new card signs photos, uploads to the API and saves managed image IDs', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:card-preview');
  URL.revokeObjectURL = vi.fn();
  const assetId = 'b'.repeat(24);
  axios.post.mockResolvedValueOnce({
    data: { uploadUrl: '/admin/uploads?ticketId=' + 'a'.repeat(24) }
  }).mockResolvedValueOnce({
    data: { assets: [{ id: assetId, url: 'https://res.cloudinary.com/demo/image/upload/card.jpg' }] }
  }).mockResolvedValueOnce({ data: { card: item } });
  const { container } = render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
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
    expect.objectContaining({ title: '108', imageAssetIds: [assetId], status: 'published' }),
    expect.objectContaining({ headers: { Authorization: 'Bearer test' } }));
  expect(axios.post.mock.calls[1][1]).toBeInstanceOf(FormData);
  expect(axios.post).toHaveBeenCalledTimes(3);
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
test('enquiry composer does not send network requests or claim delivery', () => {
  render(<MemoryRouter initialEntries={['/enquiry?card=MT.%20108']}><EnquiryPage /></MemoryRouter>);
  expect(screen.getByLabelText('कार्ड का कोड')).toHaveValue('MT. 108');
  fireEvent.change(screen.getByLabelText('आपका नाम'), {
    target: {
      value: 'Test customer'
    }
  });
  fireEvent.click(screen.getByRole('button', {
    name: 'संदेश तैयार करें ↗'
  }));
  expect(screen.getByRole('status')).toHaveTextContent('संदेश तैयार है');
  expect(axios.post).not.toHaveBeenCalled();
});
