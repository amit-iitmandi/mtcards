import Posts from "./Posts";
import { useState, useEffect } from "react";
import { loadCards } from "../utils/catalogue";

const Home = ({ filter, search = "" }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    loadCards().then(data => {
      if (active) setPosts(data);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const visible = posts.filter(item => (!filter || item.type1 === filter || item.type2 === filter) && String(item.title || "").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="home-container col-12" lang="hi">
    {loading ? <div className="catalogue-loading" role="status">कार्ड संग्रह लोड हो रहा है…</div> : error ? <div role="alert" className="catalogue-error">
      <span className="error-ornament" aria-hidden="true">❋</span><h3>आपका मनपसंद निमंत्रण, जल्द आपके सामने।</h3><p>कार्ड की सूची अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।</p>
      <button className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>फिर कोशिश करें</button>
    </div> : <Posts finalPost={visible} />}
  </div>;
};
export default Home;
