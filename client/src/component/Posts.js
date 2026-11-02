import Post from './Post';
import { useState } from "react";
const Posts = ({finalPost}) => {

  const [limit, setLimit] = useState(12)
  // const onBuy = () => {
  //   window.open(
  //     "https://wa.me/+918353064406?text=I'm%20interested%20in%20your%20for%20product"
  //   );
  //   // window.location.href ="https://wa.me/+918353064406?text=I'm%20interested%20in%20your%20for%20product";
  // };

  return (
    <>
      <div className="post-container">
          {finalPost && finalPost.length>0 && (
            <ul className="">
              {finalPost.filter((item, idx) => idx < limit).map((item, ind) => (
                <li key={ind}>
                  <div>
                    <Post item={item}/>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {finalPost?.length === 0 && <h1 className='empty-post'>इस श्रेणी में अभी कार्ड उपलब्ध नहीं हैं।</h1>}
      </div>
        {limit < finalPost.length &&<button className="w-100 btn btn-primary" onClick ={() =>setLimit(limit+12)}>और कार्ड देखें</button>}
    </>
  );
};

export default Posts;
