import './App.css';
import './storefront.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import Home from './component/Home';
import CreatePost from './component/CreatePost';

const categories = [
  { name: 'सभी कार्ड', value: '' },
  { name: 'हिन्दू विवाह', value: 'Hindu Wedding Card' },
  { name: 'आम्बेडकर विवाह', value: 'Ambedkar Wedding Card' },
  { name: 'मुस्लिम विवाह', value: 'Muslim Wedding Card' },
  { name: 'निमंत्रण पत्र', value: 'Invitation Wedding Card' }
];
const formats = ['Single Card', 'Double Fold Card', 'Triple fold Card', 'Box Card', 'Farmaan Card'].map((name, id) => ({ name, id }));

function InvitationArt() {
  return <div className="invitation-scene" role="img" aria-label="मरून और सुनहरे रंग के विवाह निमंत्रण की कलात्मक झलक">
    <div className="scene-halo" />
    <div className="paper-envelope"><span className="envelope-seal">श्री</span></div>
    <div className="invitation-paper"><div className="paper-border">
      <span className="paper-flower">❋</span><span className="paper-blessing">॥ श्री गणेशाय नमः ॥</span>
      <div className="paper-arch"><span>शुभ</span><strong>विवाह</strong><span className="paper-ornament">✦ ── ❋ ── ✦</span><p>दो दिलों का मिलन,<br />एक नये सफ़र का आरम्भ।</p></div>
      <span className="paper-bottom">स्नेहिल आमंत्रण</span>
    </div></div>
    <div className="art-note"><span>हिन्दुस्तानी परम्परा</span><small>एक खूबसूरत शुरुआत</small></div>
    <span className="scene-caption">निमंत्रण की कलात्मक झलक</span>
  </div>;
}
function App() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  return <Router><div className="storefront" lang="hi">
    <div className="announcement">शादी के कार्ड की बिक्री · प्रिंटिंग · थोक ऑर्डर <span>जखनियाँ, गाज़ीपुर</span></div>
    <header className="shop-header"><Link className="shop-brand" to="/" aria-label="माँ तारा कार्ड पैलेस होम"><span className="brand-mark">माँ</span><span><strong>माँ तारा</strong><small>कार्ड पैलेस</small></span></Link>
      <nav aria-label="मुख्य नेविगेशन"><a href="/#catalogue">कार्ड संग्रह</a><a href="/#services">हमारी सेवाएँ</a><a href="/#how-it-works">कैसे ऑर्डर करें</a></nav>
      <a className="header-action" href="/#catalogue">अपना कार्ड चुनें <span>↗</span></a>
    </header>
    <Switch><Route exact path="/">
      <main><section className="shop-hero"><div className="hero-copy"><p className="eyebrow"><span /> रिश्तों की शुरुआत, एक निमंत्रण से</p>
        <h1>आपकी खुशियों का<br /><em>पहला निमंत्रण।</em></h1>
        <p className="hero-description">परम्परा की खूबसूरती, आपके अपने अंदाज़ में।<br />अपनी शादी के लिए चुनें मनपसंद कार्ड और पाएँ<br className="desktop-break" /> डिज़ाइन से प्रिंटिंग तक हमारी मदद।</p>
        <div className="hero-actions"><a className="primary-action" href="#catalogue">कार्ड संग्रह देखें <span>↗</span></a><a className="text-action" href="#how-it-works">ऑर्डर कैसे करें <span>→</span></a></div>
        <div className="hero-footnote"><span className="fine-flower">❋</span><p>खाली कार्ड से छपे निमंत्रण तक<small>खुदरा और थोक, दोनों के लिए</small></p></div>
      </div><InvitationArt /></section>
      <div className="service-ribbon" aria-label="उपलब्ध सेवाएँ"><span>शादी के कार्ड</span><i>✦</i><span>हिन्दी प्रिंटिंग</span><i>✦</i><span>खाली कार्ड</span><i>✦</i><span>थोक ऑर्डर</span><i>✦</i><span>आपकी पसंद का डिज़ाइन</span></div>
      <section className="catalogue-section" id="catalogue"><div className="section-heading"><div><p className="eyebrow">आपके शुभ अवसर के लिए</p><h2>हर निमंत्रण, <em>कुछ ख़ास।</em></h2></div><p>अपना पसंदीदा कार्ड चुनें।<br />उपलब्धता और प्रिंटिंग के लिए पूछें।</p></div>
        <div className="catalogue-tools"><div className="category-list" role="group" aria-label="कार्ड की श्रेणी">{categories.map(category => <button key={category.value} className={filter === category.value ? 'selected' : ''} aria-pressed={filter === category.value} onClick={() => setFilter(category.value)}>{category.name}</button>)}</div>
          <label className="catalogue-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="कार्ड का नाम या कोड खोजें" aria-label="कार्ड खोजें" /></label></div>
        <Home filter={filter} search={search} />
      </section>
      <section className="services-section" id="services"><div className="service-intro"><p className="eyebrow">एक ही जगह, हर ज़रूरत</p><h2>आपका अंदाज़।<br /><em>हमारी कारीगरी।</em></h2></div><div className="service-description"><article><span>01</span><div><h3>मनपसंद खाली कार्ड</h3><p>अपनी पसंद के कार्ड चुनें और प्रिंटिंग अपनी सुविधा से करवाएँ।</p></div></article><article><span>02</span><div><h3>कार्ड और हिन्दी प्रिंटिंग</h3><p>परिवार के नाम, कार्यक्रम और पते के साथ आपका अपना निमंत्रण।</p></div></article><article><span>03</span><div><h3>खुदरा और थोक बिक्री</h3><p>मात्रा और कार्ड के अनुसार कीमत व उपलब्धता की जानकारी लें।</p></div></article></div></section>
      <section className="order-section" id="how-it-works"><p className="eyebrow">बस तीन आसान कदम</p><h2>चुनने से छपने तक, <em>हम आपके साथ।</em></h2><div className="order-steps"><article><span>01 / पसंद</span><h3>अपना कार्ड चुनें</h3><p>संग्रह देखें और मनपसंद कार्ड का कोड नोट करें।</p></article><article><span>02 / बातचीत</span><h3>ज़रूरत हमें बताएँ</h3><p>कार्ड की मात्रा, प्रिंटिंग और तारीख के बारे में बात करें।</p></article><article><span>03 / तैयारी</span><h3>विवरण पक्का करें</h3><p>कीमत, डिज़ाइन और तैयार होने का समय तय करके ऑर्डर दें।</p></article></div></section>
      </main>
    </Route><Route exact path="/upload"><div className="createPost"><CreatePost type1={categories.filter(c => c.value).map((c, id) => ({ id, name: c.value }))} type2={formats} setFilter={setFilter} /></div></Route></Switch>
    <footer className="shop-footer"><div><h2>माँ तारा कार्ड पैलेस</h2><p>हर शुभ अवसर का स्नेहिल आमंत्रण।</p></div><div><span>हमसे मिलें</span><p>जखनियाँ, गाज़ीपुर, उत्तर प्रदेश</p><a href="/#catalogue">कार्ड संग्रह देखें ↗</a></div><div className="footer-bottom">शादी के कार्ड · प्रिंटिंग · खुदरा एवं थोक बिक्री <span>सप्रेम, माँ तारा ❋</span></div></footer>
  </div></Router>;
}
export default App;
