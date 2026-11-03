import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import CreatePost from './CreatePost';
import { apiUrl } from '../utils/api';
jest.mock('axios');
jest.mock('react-image-file-resizer', () => ({ imageFileResizer: (file, w, h, format, quality, rotation, callback) => callback(file) }));
const originalBase = process.env.REACT_APP_API_BASE_URL;
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  process.env.REACT_APP_API_BASE_URL = 'https://mtcards-api.onrender.com/';
  URL.createObjectURL = jest.fn(() => 'blob:test');
});
afterEach(() => {
  if (originalBase === undefined) delete process.env.REACT_APP_API_BASE_URL;
  else process.env.REACT_APP_API_BASE_URL = originalBase;
});
function setup() {
  return render(<MemoryRouter><CreatePost type1={[{id:0,name:'Hindu Wedding Card'}]} type2={[{id:0,name:'Single Card'}]} /></MemoryRouter>);
}
function fill(container) {
  for (const [placeholder,value] of [['Card No.','123'],['Customer Price','20'],['Seller Price','15'],['Stock','100']]) {
    fireEvent.change(screen.getByPlaceholderText(placeholder),{target:{value}});
  }
  fireEvent.change(container.querySelector('input[type=file]'),{target:{files:[new File(['image'],'card.jpg',{type:'image/jpeg'})]}});
}
test('API URLs normalize trailing slashes', () => {
  expect(apiUrl('/createPost')).toBe('https://mtcards-api.onrender.com/createPost');
  process.env.REACT_APP_API_BASE_URL = '';
  expect(apiUrl('createPost')).toBe('/createPost');
});
test.each([null, 'invalid-json'])('missing or malformed session stops uploads before network calls (%s)', async stored => {
  if(stored) sessionStorage.setItem('token',stored);
  setup(); fireEvent.click(screen.getByDisplayValue('Post'));
  expect(await screen.findByRole('alert')).toHaveTextContent('लॉगिन');
  expect(axios.post).not.toHaveBeenCalled();
});
test('posts card details to Render with authorization after image upload', async () => {
  sessionStorage.setItem('token',JSON.stringify({data:{token:'Bearer test-session'}}));
  axios.post.mockResolvedValueOnce({data:{secure_url:'https://example.com/card.jpg'}}).mockResolvedValueOnce({data:{post:{}}});
  const {container}=setup(); fill(container);
  fireEvent.click(screen.getByDisplayValue('Post'));
  await waitFor(()=>expect(axios.post).toHaveBeenCalledWith(
    'https://mtcards-api.onrender.com/createPost',
    expect.objectContaining({title:'123',image:['https://example.com/card.jpg']}),
    {headers:{Authorization:'Bearer test-session'}}
  ));
  await waitFor(()=>expect(screen.getByPlaceholderText('Card No.')).toHaveValue(null));
});
test.each([401,403,500])('API %s shows an actionable error and preserves entered details', async status => {
  sessionStorage.setItem('token',JSON.stringify({data:{token:'Bearer test-session'}}));
  axios.post.mockResolvedValueOnce({data:{secure_url:'https://example.com/card.jpg'}}).mockRejectedValueOnce({response:{status}});
  const {container}=setup(); fill(container);
  fireEvent.click(screen.getByDisplayValue('Post'));
  expect(await screen.findByRole('alert')).toHaveTextContent(status===401?'लॉगिन':status===403?'अनुमति':'सहेजा नहीं');
  expect(screen.getByPlaceholderText('Card No.')).toHaveValue(123);
});
