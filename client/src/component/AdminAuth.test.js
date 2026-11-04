import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import AdminSetup from './AdminSetup';
import AdminUpload from './AdminUpload';
jest.mock('axios');
jest.mock('./CreatePost', () => () => <div>Protected editor</div>);
const beforeBase=process.env.REACT_APP_API_BASE_URL;
beforeEach(()=>{jest.clearAllMocks();sessionStorage.clear();process.env.REACT_APP_API_BASE_URL='https://api.example.com';});
afterEach(()=>{if(beforeBase===undefined)delete process.env.REACT_APP_API_BASE_URL;else process.env.REACT_APP_API_BASE_URL=beforeBase;});
function page(Component,start='/login'){return render(<MemoryRouter initialEntries={[start]}><Switch><Route exact path="/admin"><div>Admin destination</div></Route><Route path="/done"><div>Done</div></Route><Route exact path="/upload">{start==='/upload'?<AdminUpload />:<div>Upload destination</div>}</Route><Route exact path="/login">{start==='/login'?<Login />:<div>Login destination</div>}</Route><Route><Component /></Route></Switch></MemoryRouter>);}
function fillLogin(){fireEvent.change(screen.getByLabelText('ईमेल'),{target:{value:'admin@example.com'}});fireEvent.change(screen.getByLabelText('पासवर्ड'),{target:{value:'test-password'}});fireEvent.click(screen.getByRole('button',{name:'लॉगिन करें'}));}
test('login verifies admin role before storing session and redirecting',async()=>{
 axios.post.mockResolvedValue({data:{token:'Bearer test-token'}});axios.get.mockResolvedValue({data:{email:'admin@example.com'}});
 page(Login);fillLogin();expect(await screen.findByText('Admin destination')).toBeInTheDocument();
 expect(axios.post).toHaveBeenCalledWith('https://api.example.com/login',{email:'admin@example.com',userPass:'test-password'},{timeout:15000});
 expect(axios.get).toHaveBeenCalledWith('https://api.example.com/admin/session',{headers:{Authorization:'Bearer test-token'},timeout:15000});
 expect(JSON.parse(sessionStorage.getItem('token')).data.token).toBe('Bearer test-token');
});
test('non-admin login does not store a session',async()=>{
 axios.post.mockResolvedValue({data:{token:'Bearer test-token'}});axios.get.mockRejectedValue({response:{status:403}});
 page(Login);fillLogin();expect(await screen.findByRole('alert')).toHaveTextContent('अनुमति');expect(sessionStorage.getItem('token')).toBeNull();
});
test('invalid login shows a recoverable error',async()=>{
 axios.post.mockRejectedValue({response:{status:401}});page(Login);fillLogin();expect(await screen.findByRole('alert')).toHaveTextContent('सही नहीं');expect(axios.get).not.toHaveBeenCalled();
});
test('upload redirects missing session to login before mounting editor',async()=>{
 page(AdminUpload,'/upload');expect(await screen.findByText('Login destination')).toBeInTheDocument();expect(screen.queryByText('Protected editor')).not.toBeInTheDocument();expect(axios.get).not.toHaveBeenCalled();
});
test('upload verifies role and logout clears the session',async()=>{
 sessionStorage.setItem('token',JSON.stringify({data:{token:'Bearer test-token'}}));axios.get.mockResolvedValue({data:{}});
 page(AdminUpload,'/upload');expect(await screen.findByText('Protected editor')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'लॉगआउट'}));expect(await screen.findByText('Login destination')).toBeInTheDocument();expect(sessionStorage.getItem('token')).toBeNull();
});
test('expired session is cleared and redirected',async()=>{
 sessionStorage.setItem('token',JSON.stringify({data:{token:'Bearer expired'}}));axios.get.mockRejectedValue({response:{status:401}});
 page(AdminUpload,'/upload');expect(await screen.findByText('Login destination')).toBeInTheDocument();expect(sessionStorage.getItem('token')).toBeNull();
});
function fillSetup(confirm='new-password-123'){
 fireEvent.change(screen.getByLabelText('सेटअप कोड'),{target:{value:'A'.repeat(32)}});fireEvent.change(screen.getByLabelText('नया पासवर्ड'),{target:{value:'new-password-123'}});fireEvent.change(screen.getByLabelText('पासवर्ड दोबारा लिखें'),{target:{value:confirm}});fireEvent.click(screen.getByRole('button',{name:'पासवर्ड बनाएँ'}));
}
test('password mismatch is blocked without a network request',async()=>{
 page(AdminSetup,'/admin/setup');fillSetup('different-password');expect(await screen.findByRole('alert')).toHaveTextContent('एक जैसे');expect(axios.post).not.toHaveBeenCalled();
});
test('setup sends secrets only in POST body then redirects to login',async()=>{
 axios.post.mockResolvedValue({data:{success:true}});page(AdminSetup,'/admin/setup');fillSetup();expect(await screen.findByText('Login destination')).toBeInTheDocument();expect(axios.post).toHaveBeenCalledWith('https://api.example.com/admin/setup',{token:'A'.repeat(32),password:'new-password-123'},{timeout:15000});expect(sessionStorage.getItem('token')).toBeNull();
});
test('transient permission-check failure hides editor and permits retry',async()=>{
 sessionStorage.setItem('token',JSON.stringify({data:{token:'Bearer test-token'}}));axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({data:{}});
 page(AdminUpload,'/upload');expect(await screen.findByRole('alert')).toHaveTextContent('जाँचा नहीं');expect(screen.queryByText('Protected editor')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'फिर कोशिश करें'}));expect(await screen.findByText('Protected editor')).toBeInTheDocument();
});
