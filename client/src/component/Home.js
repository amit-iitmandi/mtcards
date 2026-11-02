import Posts from "./Posts";
import CreatePost from "./CreatePost";
import { useState, useEffect } from "react";
import Loading from "./Loading";
import api, { apiUrl } from "../api";

const Home = ({ filter }) => {
  const [finalPost, setFinalPost] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(async () => {
    await fetchPost();
  }, [filter]);

  const fetchPost = async () => {
    setLoading(true);
    await api
      .get(apiUrl("/allPost"), {
        headers: {},
      })
      .then((res) => {
        if (filter) {
          setFinalPost(res.data.filter((item) => item.type1 === filter || item.type2 === filter));
        } else {
          setFinalPost(res.data);
        }
        setLoading(false);
      });
  };

  return (
    <div className="home-container col-12">
      {loading && <Loading />}
      <Posts finalPost={finalPost} filter={filter} />
    </div>
  );
};

export default Home;
