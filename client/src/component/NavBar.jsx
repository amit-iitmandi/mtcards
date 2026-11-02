import React, {useState} from "react";
import { Link } from "react-router-dom";
import Tags from "./Tags"

const NavBar = ({filter, setFilter}) => {

  const type1 = [{id:1, name:"Hindu Wedding Card", color:"#FF541E"}, {id:2, name:"Ambedkar Wedding Card",color:"#024678"},{ id:3, name:"Muslim Wedding Card",color:"#02781C"},{ id:4, name:"Invitation Wedding Card",color:"#02781C"}];
  const type2 = [{id:1, name:"Single Card"}, {id:2, name:"Double Fold Card"},{ id:3, name:"Triple fold Card"},{ id:3, name:"Box Card"},{ id:4, name:"Farmaan Card"}];
  const [showCat, setShowCat] = useState(false);

  
  return (
    <div>
      <div className="nav-container">
        <p className="nav-header mb-0 ">WEDDING CARDS</p>
        <div className=" d-md-none d-block" onClick={()=> setShowCat(!showCat)}>
          {!showCat ?<svg width="28" height="24" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="10" width="28" height="4" rx="2" fill="#2B2B2B"/>
          <rect width="28" height="4" rx="2" fill="#2B2B2B"/>
          <rect y="20" width="28" height="4" rx="2" fill="#2B2B2B"/>
          </svg>:
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2.82843" width="35.0712" height="4" rx="2" transform="rotate(45 2.82843 0)" fill="#2B2B2B"/>
          <rect x="28.0001" y="3" width="35.0712" height="4" rx="2" transform="rotate(135 28.0001 3)" fill="#2B2B2B"/>
          </svg>
          }
        </div>
        <div className="tags-container d-md-block d-none">
          <Tags filter={filter} type1={type1} type2={type2} setFilter={setFilter}/>
        </div>
      </div>
      <div>
      {<div className=""> <Tags filter={filter} type1={type1} type2={type2} setFilter={setFilter} showCat={showCat} setShowCat={setShowCat}/></div>}
      </div>
    </div>
  );
};

export default NavBar;
