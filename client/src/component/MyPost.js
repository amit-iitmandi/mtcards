import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import api, { apiUrl } from "../api";

const MyPost = (props) => {
  const [post, setPost] = useState([]);

  useEffect(() => {
    fetchPost();
    console.log("called");
  }, []);

  const fetchPost = () => {
    const temp = sessionStorage.getItem("token");
    const token = JSON.parse(temp).data.token;
    api
      .get(apiUrl("/myPost"), {
        headers: {
          Authorization: token,
        },
      })
      .then((res) => {
        console.log(res.data);
        setPost(res.data);
      });
  };

  const deletePost = (postid) => {
    const temp = sessionStorage.getItem("token");
    const token = JSON.parse(temp).data.token;
    api
      .delete(apiUrl(`/deletePost/${postid}`), {
        headers: {
          Authorization: token,
        },
      })
      .then((res) => console.log("success"))
      .catch((err) => console.log(err));
    console.log("delete");
  };

  const [userPost, setUserPost] = useState({
    img: null,
    caption: "",
  });

  return (
    <div className="Post-page">
      <h1>My Products</h1>
      <div className="Post-containers">
        {post.length !== 0 ? (
          <ul>
            {post.map((item, ind) => (
              <li key={ind}>
                <div className="Post-content">
                  <div className="post-img-capt img-capt">
                    <img src={item.image} />
                    <div>
                      <div className="post-text">
                        <h2>{item.title}</h2>
                      </div>
                      <div className="post-text">
                        <h4>Price: ₹ {item.price}</h4>
                      </div>
                      <div className="post-text">Stock: {item.stock}</div>
                      <div className="post-text">
                        <h6>Description: {item.description}</h6>
                      </div>
                    </div>
                  </div>
                  <input id="del" type="button" onClick={() => deletePost(item._id)} />
                  <label htmlFor="del">
                    <i class="material-icons">cancel</i>
                  </label>
                </div>
                <div className="post-button">
                  <input type="button" value="Edit" />
                  <input type="button" value="Share" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <h4> No products to Sell</h4>
        )}
      </div>
    </div>
  );
};

export default MyPost;
