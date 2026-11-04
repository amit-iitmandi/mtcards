import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminWorkspace from './AdminWorkspace';
import CardEditor from './CardEditor';
import EnquiryPage from './EnquiryPage';
jest.mock('axios');
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
  jest.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem('token', JSON.stringify({
    data: {
      token: 'Bearer test'
    }
  }));
  axios.get.mockImplementation(url => Promise.resolve({
    data: url.endsWith('/admin/session') ? {} : [item, { ...item,
      _id: 'second',
      title: '205',
      stock: 12
    }]
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
test('new card creation preserves zero stock and waits for valid server result', async () => {
  axios.post.mockResolvedValue({
    data: {
      post: item
    }
  });
  const {
    container
  } = render(<MemoryRouter><CardEditor {...props} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Card code'), {
    target: {
      value: '108'
    }
  });
  fireEvent.change(screen.getByLabelText('Recorded stock'), {
    target: {
      value: '0'
    }
  });
  fireEvent.change(screen.getByLabelText('Customer price · ₹'), {
    target: {
      value: '20'
    }
  });
  fireEvent.change(screen.getByLabelText('Selling price · ₹'), {
    target: {
      value: '15'
    }
  });
  fireEvent.change(screen.getByLabelText('Hosted image URL'), {
    target: {
      value: 'https://example.com/card.jpg'
    }
  });
  fireEvent.click(screen.getByRole('button', {
    name: 'Add image'
  }));
  fireEvent.submit(container.querySelector('form'));
  expect(await screen.findByRole('status')).toHaveTextContent('Card created');
  expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/createPost'), expect.objectContaining({
    stock: '0',
    image: item.image
  }), expect.objectContaining({
    headers: {
      Authorization: 'Bearer test'
    }
  }));
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
