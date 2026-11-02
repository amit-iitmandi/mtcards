import { useState } from "react";
import PopupCard from './PopupCard'
import './post.css';
import { inquiryUrl } from '../utils/inquiry';

const Post = ({item}) =>{
    const [isOpen, setIsOpen] = useState(false);
    const inquiry = inquiryUrl(item, process.env.REACT_APP_WHATSAPP_NUMBER);
    return(
        <div className="post-card">
            <div className="post-content">

                <div className="post-img" onClick={() => setIsOpen(true)}>
                    <img src={item.image && item.image[0]} loading="lazy" alt={`शादी का कार्ड MT. ${item.title}`} />
                </div>
                {isOpen && <PopupCard item={item} setIsOpen= {setIsOpen}/>}
                {/* <div className="post-button">
                <input type="button" value="Like" />
                <input
                    className="buy-btn"
                    onClick={() => onBuy()}
                    type="button"
                    value="Buy Now"
                    />
                <input type="button" value="Share" />
                </div> */}
                <div className="post-title">
                    <p>MT. {item.title}</p>
                    <p>₹ {item.sPrice}/-</p>
                    {inquiry && <a className="btn btn-success" href={inquiry} target="_blank" rel="noopener noreferrer">WhatsApp पर पूछें</a>}
                </div>
            </div>
            
        </div>
    )
}
export default Post;