import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {loadCards} from '../utils/catalogue';
import {SaveCard} from './Shortlist';
import './featuredCarousel.css';
export default function FeaturedCardsCarousel(){
 const [cards,setCards]=useState([]),[state,setState]=useState('loading'),[attempt,setAttempt]=useState(0),[index,setIndex]=useState(0);
 useEffect(()=>{let active=true;setState('loading');loadCards().then(data=>{if(active){setCards(data.filter(c=>c._id&&c.image?.[0]).sort((a,b)=>Number(b.featured===true)-Number(a.featured===true)).slice(0,10));setIndex(0);setState('ready');}}).catch(()=>{if(active)setState('error');});return()=>{active=false;};},[attempt]);
 const [paused,setPaused]=useState(false);
 const [hovered,setHovered]=useState(false);
 const [focused,setFocused]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);

 useEffect(()=>{
   const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
   const update=event=>setReducedMotion(event.matches);
   preference?.addEventListener?.('change',update);
   return ()=>preference?.removeEventListener?.('change',update);
 },[]);

 useEffect(()=>{
   if(cards.length<2 || paused || hovered || focused || reducedMotion) return;
   const timer=window.setTimeout(()=>{
     if(!document.hidden) setIndex(current=>(current+1)%cards.length);
   },5000);
   const resume=()=>{
     window.clearTimeout(timer);
     if(!document.hidden) setIndex(current=>(current+1)%cards.length);
   };
   document.addEventListener('visibilitychange',resume);
   return ()=>{
     window.clearTimeout(timer);
     document.removeEventListener('visibilitychange',resume);
   };
 },[cards.length,index,paused,hovered,focused,reducedMotion]);

 const card=cards[index];
 const go=delta=>setIndex(i=>(i+delta+cards.length)%cards.length);
 return <section className="invitation-banner" aria-label="चुनिंदा शादी के कार्ड"
   onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}}
   onPointerLeave={()=>setHovered(false)}
   onFocus={event=>{if(event.target.matches(':focus-visible'))setFocused(true);}}
   onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}><div className="banner-topline"><span>THE WEDDING INVITATION EDIT</span><Link to="/catalogue">पूरा संग्रह देखें ↗</Link></div>{state==='loading'?<div className="banner-placeholder" role="status">आपके लिए निमंत्रण सज रहे हैं…</div>:state==='error'?<div className="banner-placeholder" role="alert">कार्ड लोड नहीं हुए। <button onClick={()=>setAttempt(v=>v+1)}>फिर कोशिश करें</button></div>:!card?<div className="banner-placeholder">अभी कोई कार्ड उपलब्ध नहीं है। <Link to="/catalogue">संग्रह देखें</Link></div>:<><div className="banner-stage" role="region" aria-roledescription="carousel" aria-label="विवाह निमंत्रण" onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();go(1);}if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}}} tabIndex={0}><div className="banner-art"><span className="banner-script" aria-hidden="true">सप्रेम आमंत्रण</span><Link to={`/cards/${encodeURIComponent(card._id)}`} className="banner-card-image"><img src={card.image[0]} alt={`विवाह निमंत्रण MT. ${card.title}`} loading="eager"/></Link><span className="banner-art-caption">माँ तारा कार्ड पैलेस · जखनियाँ</span></div><div className="banner-copy"><p className="banner-kicker">एक खूबसूरत शुरुआत</p><h1>खुशियों का न्योता,<br/><em>आपके अंदाज़ में।</em></h1><p className="banner-description">{card.description||'अपने शुभ अवसर के लिए चुनें एक ऐसा निमंत्रण, जिसमें झलके आपकी अपनी पसंद।'}</p><div className="banner-product"><strong>MT. {card.title}</strong><span>{card.type2||'विवाह निमंत्रण'}</span><b>{card.cPrice!=null?`₹${card.cPrice}`:'कीमत पूछें'}</b></div><Link className="banner-cta" to={`/cards/${encodeURIComponent(card._id)}`}>इस निमंत्रण को देखें <span>↗</span></Link><SaveCard item={card}/><small className="banner-price-note">मात्रा और प्रिंटिंग के लिए दुकान से जानकारी लें।</small></div></div><div className="banner-navigation"><div className="banner-arrows"><button aria-label="पिछला निमंत्रण" disabled={cards.length<2} onClick={()=>go(-1)}>←</button><span aria-live="polite">{String(index+1).padStart(2,'0')} <i>/ {String(cards.length).padStart(2,'0')}</i></span><button aria-label="अगला निमंत्रण" disabled={cards.length<2} onClick={()=>go(1)}>→</button></div>{cards.length>1&&!reducedMotion&&<button type="button" className="save-card" onClick={()=>setPaused(value=>!value)}>{paused?'स्लाइड चलाएँ':'स्लाइड रोकें'}</button>}<div className="banner-selectors" role="group" aria-label="निमंत्रण चुनें">{cards.map((c,i)=><button key={c._id} aria-label={`MT. ${c.title} दिखाएँ`} aria-pressed={i===index} onClick={()=>setIndex(i)}><span/></button>)}</div><Link to="/catalogue">और डिज़ाइन खोजें ↓</Link></div></>}</section>;
}
