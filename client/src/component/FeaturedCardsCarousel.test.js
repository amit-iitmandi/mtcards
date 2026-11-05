import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import FeaturedCardsCarousel from './FeaturedCardsCarousel';
jest.mock('axios');

const cards = [
  { _id: 'first', title: '101', sPrice: '12', type1: 'Hindu Wedding Card', type2: 'Single Card', image: ['https://example.com/101.jpg'] },
  { _id: 'second', title: '102', sPrice: '15', type1: 'Muslim Wedding Card', image: ['https://example.com/102.jpg'] }
];

beforeEach(() => { jest.clearAllMocks(); process.env.REACT_APP_WHATSAPP_NUMBER = '+91 83530 64406'; });
afterEach(() => { delete process.env.REACT_APP_WHATSAPP_NUMBER; });

test('live cards appear in the homepage carousel and link to a detailed WhatsApp message', async () => {
  axios.get.mockResolvedValue({ data: cards });
  render(<MemoryRouter><FeaturedCardsCarousel fallback={<div>Wedding artwork</div>} /></MemoryRouter>);
  const link = await screen.findByRole('link', { name: /MT. 101 के लिए WhatsApp/ });
  const url = new URL(link.getAttribute('href'));
  expect(url.hostname).toBe('wa.me');
  expect(url.searchParams.get('text')).toContain('MT. 101');
  expect(url.searchParams.get('text')).toContain('₹12');
  expect(url.searchParams.get('text')).toContain('Hindu Wedding Card');
  expect(url.searchParams.get('text')).toContain('https://example.com/101.jpg');
  expect(link).toHaveAttribute('target', '_blank');
  fireEvent.click(screen.getByRole('button', { name: 'अगला कार्ड' }));
  expect(screen.getByText('02 / 02')).toBeInTheDocument();
});

test('without configured WhatsApp, clicking a card goes to the enquiry form', async () => {
  delete process.env.REACT_APP_WHATSAPP_NUMBER;
  axios.get.mockResolvedValue({ data: [cards[0]] });
  render(<MemoryRouter><FeaturedCardsCarousel fallback={<div>Wedding artwork</div>} /></MemoryRouter>);
  const link = await screen.findByRole('link', { name: /MT. 101 के लिए पूछताछ/ });
  expect(link).toHaveAttribute('href', '/enquiry?card=MT.%20101');
  expect(link).not.toHaveAttribute('target');
});

test('when the catalogue fails, the original homepage artwork remains visible', async () => {
  axios.get.mockRejectedValue(new Error('offline'));
  render(<MemoryRouter><FeaturedCardsCarousel fallback={<div>Wedding artwork</div>} /></MemoryRouter>);
  expect(await screen.findByText('Wedding artwork')).toBeInTheDocument();
});
