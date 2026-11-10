import React,{createContext,useContext,useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {loadCards} from '../utils/catalogue';
const Context=createContext({ids:[],toggle:()=>{},clear:()=>{}});
export const useShortlist=()=>useContext(Context);
export function ShortlistProvider({children}){
 const [ids,setIds]=useState(()=>{try{const a=JSON.parse(localStorage.getItem('mtcards-shortlist'));return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,50):[];}catch{return [];}});
 function update(next){setIds(next);try{localStorage.setItem('mtcards-shortlist',JSON.stringify(next));}catch{/* Browsing still works when storage is blocked. */}}
 return <Context.Provider value={{ids,toggle:id=>update(ids.includes(id)?ids.filter(x=>x!==id):[...ids,id].slice(0,50)),clear:()=>update([])}}>{children}</Context.Provider>;
}
export function SaveCard({item}){const {ids,toggle}=useShortlist();return item._id?<button className="save-card" aria-pressed={ids.includes(item._id)} onClick={()=>toggle(item._id)}>{ids.includes(item._id)?'♥ सहेजा गया':'♡ पसंद में रखें'}</button>:null;}
export function ShortlistPage(){const {ids,clear,toggle}=useShortlist();const [cards,setCards]=useState([]),[error,setError]=useState(false);useEffect(()=>{let active=true;loadCards().then(items=>{if(active)setCards(items);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);const names=ids.map(id=>cards.find(c=>c._id===id)).filter(Boolean).map(c=>`MT. ${c.title}`);return <main className="collection-content"><h1>आपके पसंदीदा कार्ड</h1><p>पसंद किए कार्ड इसी डिवाइस पर सुरक्षित रहते हैं।</p>{ids.length?<><p>{ids.length} कार्ड चुने गए</p>{error&&<p role="alert">कार्ड के विवरण अभी लोड नहीं हुए। संग्रह से फिर कोशिश करें।</p>}{ids.map(id=><p key={id}><Link to={`/cards/${encodeURIComponent(id)}`}>{cards.find(c=>c._id===id)?.title?`MT. ${cards.find(c=>c._id===id).title}`:"कार्ड देखें"} ↗</Link><button className="save-card" onClick={()=>toggle(id)}>हटाएँ</button></p>)}{names.length>0&&<Link className="primary-action" to={`/enquiry?cards=${encodeURIComponent(names.join(', '))}`}>सभी के लिए पूछें ↗</Link>}<button className="save-card" onClick={clear}>पसंद की सूची खाली करें</button></>:<p>अभी कोई कार्ड नहीं चुना है। <Link to="/catalogue">संग्रह देखें ↗</Link></p>}</main>;}
