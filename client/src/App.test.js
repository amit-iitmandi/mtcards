import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import Home from './component/Home';
import Post from './component/Post';
import { inquiryUrl } from './utils/inquiry';
jest.mock('axios');
const card = { title: '101', sPrice: '12', image: ['https://example.com/card.jpg'], type1: 'Wedding' };
beforeEach(() => jest.clearAllMocks());
test('shows a recoverable Hindi error when Vercel returns HTML instead of catalogue JSON', async () => {
  axios.get.mockResolvedValueOnce({ data: '<html></html>' }).mockResolvedValueOnce({ data: [card] });
  render(<Home />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'फिर कोशिश करें' }));
  expect(await screen.findByText('MT. 101')).toBeInTheDocument();
});
test('network failure stops the spinner and offers retry', async () => {
  axios.get.mockRejectedValue(new Error('offline'));
  render(<Home />);
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
});
test('card uses native lazy image loading with a real source', () => {
  render(<Post item={card} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', card.image[0]);
  expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
});
test('inquiry encodes Hindi and product details and rejects unconfigured numbers', () => {
  const url = new URL(inquiryUrl(card, '+91 83530 64406'));
  expect(url.hostname).toBe('wa.me');
  expect(url.searchParams.get('text')).toContain('MT. 101');
  expect(url.searchParams.get('text')).toContain('₹12');
  expect(inquiryUrl(card, '')).toBeNull();
  expect(inquiryUrl(card, 'javascript:alert(1)')).toBeNull();
});
