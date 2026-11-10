import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,Route} from 'react-router-dom';
import {vi,test,expect,beforeEach} from 'vitest';
import {ShortlistProvider,SaveCard} from './Shortlist';
import CardDetails from './CardDetails';
import {loadCards} from '../utils/catalogue';
vi.mock('../utils/catalogue',()=>({loadCards:vi.fn()}));
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();});
test('shortlist persists and toggles without sending customer data',()=>{render(<ShortlistProvider><SaveCard item={{_id:'one'}}/></ShortlistProvider>);fireEvent.click(screen.getByRole('button'));expect(JSON.parse(localStorage.getItem('mtcards-shortlist'))).toEqual(['one']);expect(screen.getByRole('button')).toHaveAttribute('aria-pressed','true');fireEvent.click(screen.getByRole('button'));expect(JSON.parse(localStorage.getItem('mtcards-shortlist'))).toEqual([]);});
test('details uses public customer price and carries card code and quantity to enquiry',async()=>{loadCards.mockResolvedValue([{_id:'one',title:'108',cPrice:'25',image:['https://example.com/card.jpg']}]);render(<MemoryRouter initialEntries={['/cards/one']}><Route path="/cards/:id"><CardDetails/></Route></MemoryRouter>);expect(await screen.findByText('MT. 108')).toBeInTheDocument();expect(screen.getByText('₹25')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('कार्ड की मात्रा'),{target:{value:'150'}});expect(screen.getByRole('link',{name:'इस कार्ड के बारे में पूछें ↗'})).toHaveAttribute('href','/enquiry?card=MT.%20108&quantity=150');});

test('banner carousel shows one product and switches using arrows and selectors',async()=>{
 const {default:Carousel}=await import('./FeaturedCardsCarousel');
 loadCards.mockResolvedValue([{_id:'one',title:'108',cPrice:'25',image:['https://example.com/one.jpg']},{_id:'two',title:'209',cPrice:'35',image:['https://example.com/two.jpg']}]);
 render(<MemoryRouter><Carousel/></MemoryRouter>);
 expect(await screen.findByRole('img',{name:'विवाह निमंत्रण MT. 108'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'अगला निमंत्रण'}));
 expect(screen.getByRole('img',{name:'विवाह निमंत्रण MT. 209'})).toBeInTheDocument();
 expect(screen.queryByRole('img',{name:'विवाह निमंत्रण MT. 108'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'MT. 108 दिखाएँ'}));
 expect(screen.getByRole('img',{name:'विवाह निमंत्रण MT. 108'})).toBeInTheDocument();
});
