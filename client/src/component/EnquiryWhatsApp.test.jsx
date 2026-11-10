import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {test,expect,vi,afterEach} from 'vitest';
import EnquiryPage from './EnquiryPage';
const original=process.env.REACT_APP_WHATSAPP_NUMBER;
afterEach(()=>{if(original===undefined)delete process.env.REACT_APP_WHATSAPP_NUMBER;else process.env.REACT_APP_WHATSAPP_NUMBER=original;});
test('enquiry redirects to configured WhatsApp with card, quantity and price request',()=>{process.env.REACT_APP_WHATSAPP_NUMBER='+91 99999 99999';const navigate=vi.fn();render(<MemoryRouter initialEntries={['/enquiry?card=MT.%20108&quantity=150']}><EnquiryPage navigate={navigate}/></MemoryRouter>);expect(screen.queryByRole('textbox')).not.toBeInTheDocument();const url=new URL(navigate.mock.calls[0][0]);expect(url.hostname).toBe('wa.me');expect(url.pathname).toBe('/919999999999');for(const text of ['MT. 108','150','कीमत','प्रिंटिंग','कुल कोटेशन'])expect(url.searchParams.get('text')).toContain(text);});
test('unconfigured WhatsApp does not redirect to a guessed number',()=>{delete process.env.REACT_APP_WHATSAPP_NUMBER;const navigate=vi.fn();render(<MemoryRouter><EnquiryPage navigate={navigate}/></MemoryRouter>);expect(navigate).not.toHaveBeenCalled();});
