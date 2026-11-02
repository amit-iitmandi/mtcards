import "./createPost.css";
import { useState } from "react";
import Compress from "react-image-file-resizer";
import Loading from "./Loading";
import api, { apiUrl } from "../api";

const CreatePost = ({ type1, type2 }) => {
  const [image, setImage] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [stock, setStock] = useState("");
  const [title, setTitle] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [description, setDescription] = useState("");
  let urls = [];
  const [loading, setLoading] = useState(false);
  let images = [];
  const [t1, setT1] = useState(type1[0].name);
  const [t2, setT2] = useState(type2[0].name);

  const finalPost = async (url) => {
    if (url && url.length > 0) {
      const temp = sessionStorage.getItem("token");
      let token;
      if (temp) {
        token = JSON.parse(temp).data.token;
      }
      if (url.length == Object.keys(imageUrls).length) {
        setLoading(true);
        await api
          .post(
            apiUrl("/createPost"),
            {
              cPrice,
              sPrice,
              description,
              title,
              stock,
              image: url,
              type1: t1,
              type2: t2,
            },
            {
              headers: {
                Authorization: token,
              },
            }
          )
          .then((res) => {
            setLoading(false);
            clearPost();
          })
          .catch((err) => {
            setLoading(false);
            console.log(err);
          });
      }
    }
  };

  const creatingUrls = async (file) => {
    if (file) {
      const formdata = new FormData();
      formdata.append("file", file);
      formdata.append("upload_preset", "card_img");
      formdata.append("cloud_name", "chauhancloud");
      setLoading(true);
      await api
        .post("https://api.cloudinary.com/v1_1/chauhancloud/image/upload", formdata)
        .then((data) => {
          console.log(data.data.secure_url);
          urls.push(data.data.secure_url);
          finalPost(urls);
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
          console.log(err);
        });
    }
  };

  const clearPost = () => {
    console.log("Clearing");
    setStock("");
    setTitle("");
    setCPrice("");
    setSPrice("");
    setDescription("");
    setImage([]);
    setImageUrls([]);
  };

  const postToDB = async () => {
    if (cPrice && sPrice && title && stock && type1 && type2) {
      Object.keys(imageUrls).map(async (ind) => {
        Compress.imageFileResizer(
          imageUrls[ind],
          1280,
          1280,
          "JPEG",
          70,
          0,
          (uri) => {
            const myFile = new File([uri], "image.jpeg", {
              type: uri.type,
            });
            creatingUrls(myFile).then((res) => {
              console.log(res);
            });
          },
          "blob"
        );
      });
    } else {
      window.alert("Data insufficient");
    }
  };

  const uploadFiles = (e) => {
    Object.keys(e.target.files).map((item) => {
      const file = e.target.files[item];
      images.push(URL.createObjectURL(file));
    });
    setImage([...image, ...images]);
    setImageUrls([...imageUrls, ...e.target.files]);
  };

  return (
    <div className="createPost-container container">
      {loading && <Loading />}
      <div className="createPost-file-box">
        <input
          className="createPost-file"
          multiple
          type="file"
          name="image"
          id="file"
          onChange={(e) => uploadFiles(e)}
        />
      </div>
      <div className="createPost-input-box">
        <div className="createPost-input">
          {image.length > 0 && (
            <div className="createPost-image">
              {image.map((item) => {
                return (
                  <div>
                    <img src={item} />
                  </div>
                );
              })}
            </div>
          )}
          <label htmlFor="file" className="btn btn-primary">
            +
          </label>
          <div className="createPost-description">
            <input
              type="number"
              maxLength="50"
              placeholder="Card No."
              className="text-input"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
              min="0"
            />
            <input
              type="number"
              maxLength="10"
              placeholder="Customer Price"
              className="text-input"
              onChange={(e) => setCPrice(e.target.value)}
              value={cPrice}
              min="0"
            />
            <input
              type="number"
              maxLength="10"
              placeholder="Seller Price"
              className="text-input"
              onChange={(e) => setSPrice(e.target.value)}
              value={sPrice}
              min="0"
            />
            <input
              type="number"
              min="0"
              maxLength="10"
              placeholder="Stock"
              className="text-input"
              onChange={(e) => setStock(e.target.value)}
              value={stock}
            />
            <div class=""></div>
            <select
              className="custom-select"
              onChange={(e) => setT1(type1.find((item) => item.id == e.target.value).name)}
            >
              {type1.map((item) => {
                return <option value={item.id}>{item.name}</option>;
              })}
            </select>
            <select
              className="custom-select"
              onChange={(e) => setT2(type2.find((item) => item.id == e.target.value).name)}
            >
              {type2.map((item) => {
                return <option value={item.id}>{item.name}</option>;
              })}
            </select>
          </div>
        </div>
        <div className="createPost-buttons">
          <input type="button" onClick={() => setImage("")} value="Remove Image" />
          <input type="button" onClick={() => postToDB()} value="Post" />
          <input type="button" onClick={clearPost} value="Clear Post" />
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
