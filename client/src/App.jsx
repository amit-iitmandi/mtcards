import { whatsappUrl } from './utils/inquiry';
import './App.css';
import './storefront.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Switch, Route, Link, Redirect, useLocation } from 'react-router-dom';
import Home from './component/Home';
import FeaturedCardsCarousel from './component/FeaturedCardsCarousel';
import CardDetails from './component/CardDetails';
import {ShortlistProvider,ShortlistPage,useShortlist} from './component/Shortlist';
import './customer.css';
import AdminWorkspace from './component/AdminWorkspace';
import CataloguePage from './component/CataloguePage';
import EnquiryPage from './component/EnquiryPage';
import Login from './component/Login';
import AdminSetup from './component/AdminSetup';
const categories = [{
  name: 'सभी कार्ड',
  value: ''
}, {
  name: 'हिन्दू विवाह',
  value: 'Hindu Wedding Card'
}, {
  name: 'आम्बेडकर विवाह',
  value: 'Ambedkar Wedding Card'
}, {
  name: 'मुस्लिम विवाह',
  value: 'Muslim Wedding Card'
}, {
  name: 'निमंत्रण पत्र',
  value: 'Invitation Wedding Card'
}];
const shopLocation = encodeURIComponent('P9V9+7JV, Shahpur Bahor Rai, Ghazipur, Uttar Pradesh 275203');
const shopDirections = `https://www.google.com/maps/dir/?api=1&destination=${shopLocation}`;
const shopMap = `https://www.google.com/maps?q=${shopLocation}&output=embed`;

const formats = ['Single Card', 'Double Fold Card', 'Triple fold Card', 'Box Card', 'Farmaan Card'].map((name, id) => ({
  name,
  id
}));

function InvitationArt() {
  return <figure className="wedding-visual">
    <img src="/images/wedding-stationery-1536.webp" srcSet="/images/wedding-stationery-800.webp 800w, /images/wedding-stationery-1536.webp 1536w" sizes="(max-width: 680px) 100vw, 60vw" width="1536" height="1024" alt="गुलाब, गेंदे के फूल और विवाह मंडप के साथ सुनहरी नक्काशी वाला निमंत्रण" fetchPriority="high" />
    <div className="photo-lettering" aria-hidden="true"><span>सप्रेम</span><strong>आमंत्रण</strong></div>
    <figcaption>कल्पना से सजा निमंत्रण · AI से रचित दृश्य</figcaption>
  </figure>;
}

function App() {
  return <Router><ShortlistProvider><Storefront /></ShortlistProvider></Router>;
}

function Storefront() {
  const location = useLocation();
  const {ids}=useShortlist();
  const isAdmin = location.pathname.startsWith("/admin") && location.pathname !== "/admin/setup";
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  return <div className={`storefront ${isAdmin ? "workspace-view" : ""}`} lang="hi">
    <div className="announcement">शादी के कार्ड की बिक्री · प्रिंटिंग · थोक ऑर्डर <span>जखनियाँ, गाज़ीपुर</span></div>
    <header className="shop-header"><Link className="shop-brand" to="/" aria-label="माँ तारा कार्ड पैलेस होम"><span className="brand-mark">माँ</span><span><strong>माँ तारा</strong><small>कार्ड पैलेस</small></span></Link>
      <nav aria-label="मुख्य नेविगेशन"><Link to="/catalogue">कार्ड संग्रह</Link><a href="/#services">हमारी सेवाएँ</a><a href={whatsappUrl()}>पूछताछ करें</a><Link to="/shortlist">♡ पसंद ({ids.length})</Link></nav>
      <a className="header-action" href="/#catalogue">अपना कार्ड चुनें <span>↗</span></a>
    </header>
    <Switch><Route path="/cards/:id"><CardDetails /></Route><Route exact path="/shortlist"><ShortlistPage /></Route><Route exact path="/">
      <main><FeaturedCardsCarousel /><div className="service-ribbon" aria-label="उपलब्ध सेवाएँ"><span>शादी के कार्ड</span><i>✦</i><span>हिन्दी प्रिंटिंग</span><i>✦</i><span>खाली कार्ड</span><i>✦</i><span>थोक ऑर्डर</span><i>✦</i><span>आपकी पसंद का डिज़ाइन</span></div>
      <section className="catalogue-section" id="catalogue"><div className="section-heading"><div><p className="eyebrow">आपके शुभ अवसर के लिए</p><h2>हर निमंत्रण, <em>कुछ ख़ास।</em></h2></div><p>अपना पसंदीदा कार्ड चुनें।<br />उपलब्धता और प्रिंटिंग के लिए पूछें।</p></div>
        <div className="catalogue-tools"><div className="category-list" role="group" aria-label="कार्ड की श्रेणी">{categories.map(category => <button key={category.value} className={filter === category.value ? 'selected' : ''} aria-pressed={filter === category.value} onClick={() => setFilter(category.value)}>{category.name}</button>)}</div>
          <label className="catalogue-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="कार्ड का नाम या कोड खोजें" aria-label="कार्ड खोजें" /></label></div>
        <Home filter={filter} search={search} />
      </section>
      <section className="wedding-story" aria-labelledby="story-title"><figure><img src="/images/wedding-story-800.webp" srcSet="/images/wedding-story-800.webp 800w, /images/wedding-story-1536.webp 1536w" sizes="(max-width: 680px) 100vw, 50vw" width="1536" height="1024" loading="lazy" alt="मेहंदी और चूड़ियों से सजे हाथों में सुनहरा विवाह निमंत्रण" /><figcaption>AI से रचित प्रेरणात्मक दृश्य</figcaption></figure><div className="story-copy"><p className="eyebrow">कागज़ पर प्यार, अपनों तक पैग़ाम</p><h2 id="story-title">बस एक कार्ड नहीं,<br /><em>खुशियों का पैग़ाम।</em></h2><p>पहला नाम लिखने से लेकर आख़िरी न्योता देने तक, हर छोटे लम्हे में आपकी कहानी है। उसे सजाएँ अपने रंगों, अपनी भाषा और अपने अंदाज़ में।</p><a className="text-action" href="#services">मिलकर बनाएँ आपका निमंत्रण <span>↗</span></a><span className="story-signature" aria-hidden="true">शुभारम्भ</span></div></section>
      <section className="services-section" id="services"><div className="service-intro"><p className="eyebrow">एक ही जगह, हर ज़रूरत</p><h2>आपका अंदाज़।<br /><em>हमारी कारीगरी।</em></h2></div><div className="service-description"><article><span>01</span><div><h3>मनपसंद खाली कार्ड</h3><p>अपनी पसंद के कार्ड चुनें और प्रिंटिंग अपनी सुविधा से करवाएँ।</p></div></article><article><span>02</span><div><h3>कार्ड और हिन्दी प्रिंटिंग</h3><p>परिवार के नाम, कार्यक्रम और पते के साथ आपका अपना निमंत्रण।</p></div></article><article><span>03</span><div><h3>खुदरा और थोक बिक्री</h3><p>मात्रा और कार्ड के अनुसार कीमत व उपलब्धता की जानकारी लें।</p></div></article></div></section>
      <section className="order-section" id="how-it-works"><p className="eyebrow">बस तीन आसान कदम</p><h2>चुनने से छपने तक, <em>हम आपके साथ।</em></h2><div className="order-steps"><article><span>01 / पसंद</span><h3>अपना कार्ड चुनें</h3><p>संग्रह देखें और मनपसंद कार्ड का कोड नोट करें।</p></article><article><span>02 / बातचीत</span><h3>ज़रूरत हमें बताएँ</h3><p>कार्ड की मात्रा, प्रिंटिंग और तारीख के बारे में बात करें।</p></article><article><span>03 / तैयारी</span><h3>विवरण पक्का करें</h3><p>कीमत, डिज़ाइन और तैयार होने का समय तय करके ऑर्डर दें।</p></article></div></section>
      </main>
    </Route><Route exact path="/catalogue"><CataloguePage categories={categories} /></Route><Route exact path="/enquiry"><EnquiryPage /></Route><Route path={["/upload", "/admin"]}><Switch><Route exact path="/admin/setup"><AdminSetup /></Route><Route exact path="/upload"><Redirect to="/admin/cards/new" /></Route><Route><AdminWorkspace type1={categories.filter(c => c.value).map((c, id) => ({
              id,
              name: c.value
            }))} type2={formats} /></Route></Switch></Route><Route exact path="/login"><Login /></Route><Route exact path="/admin/setup"><AdminSetup /></Route></Switch>
    <footer className="shop-footer"><div><h2>माँ तारा कार्ड पैलेस</h2><p>हर शुभ अवसर का स्नेहिल आमंत्रण।</p></div><div><span>हमसे मिलें</span><p>जखनियाँ, गाज़ीपुर, उत्तर प्रदेश</p><a href={shopDirections} target="_blank" rel="noopener noreferrer">Google Maps पर रास्ता देखें ↗</a></div>
    {!isAdmin && <iframe className="shop-map" title="Google Maps पर माँ तारा कार्ड पैलेस" src={shopMap} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />}
    <div className="footer-bottom">शादी के कार्ड · प्रिंटिंग · खुदरा एवं थोक बिक्री <span>सप्रेम, माँ तारा ❋ · <Link to="/login">व्यवस्थापक लॉगिन</Link></span></div></footer>
  </div>;
}

export default App;
