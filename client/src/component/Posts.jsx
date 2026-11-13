import Post from './Post';
import { useState, useEffect } from 'react';
const Posts = ({ finalPost }) => {
  const [limit, setLimit] = useState(12);
  useEffect(() => setLimit(12), [finalPost]);
  return <><div className="catalogue-count">{finalPost.length} कार्ड मिले</div><div className="post-container">
    {finalPost.length > 0 ? <>{finalPost.length > 1 && <p className="catalogue-swipe-hint">← कार्ड देखने के लिए स्वाइप करें →</p>}<ul tabIndex={0} aria-label="कार्ड संग्रह">{finalPost.slice(0, limit).map((item, index) => <li key={item._id || `${item.title}-${index}`}><Post item={item} /></li>)}</ul></> : <p className="empty-post">इस खोज में अभी कार्ड उपलब्ध नहीं हैं। दूसरी श्रेणी या कोड चुनें।</p>}
  </div>{limit < finalPost.length && <button className="load-more" onClick={() => setLimit(value => value + 12)}>और कार्ड देखें ↓</button>}</>;
};
export default Posts;
