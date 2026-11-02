import "./App.css";
import React, { useState, useEffect } from "react";
// import Login from "./component/Login";
// import Signup from "./component/Signup";
import Home from "./component/Home";
import NavBar from "./component/NavBar";
// import MyPost from "./component/MyPost";
// import Profile from "./component/Profile";
import { useHistory } from "react-router-dom";
import {
  BrowserRouter as Router,
  Switch,
  Link,
  Route,
  Redirect,
} from "react-router-dom";
import CreatePost from "./component/CreatePost";
// Lazy image loading package is not installed; native image loading remains available.
// import a plugin


function setToken(userToken) {
  console.log(userToken);
  // sessionStorage.setItem("jwt", userToken.token);
  sessionStorage.setItem("token", JSON.stringify(userToken));
}

function getToken() {
  const tokenString = sessionStorage.getItem("token");
  const userToken = JSON.parse(tokenString);
  return userToken;
}

function App() {
  const [filter, setFilter] = useState('Hindu Wedding Card');
  const Routing = () => {
    
    const history = useHistory();
    const token = getToken();
    // useEffect(() => {
    //   if (!token) history.push("/");
    //   else history.push("/");
    // }, [token]);
    
    const type1 = [{id:1, name:"Hindu Wedding Card"}, {id:2, name:"Ambedkar Wedding Card"},{ id:3, name:"Muslim Wedding Card"},{ id:4, name:"Invitation Wedding Card"}];
    const type2 = [{id:1, name:"Single Card"}, {id:2, name:"Double Fold Card"},{ id:3, name:"Triple fold Card"},{ id:3, name:"Box Card"},{ id:4, name:"Farmaan Card"}];
    return (
      <Switch>
        <Route exact path="/">
          <Home filter={filter}/>
        </Route>
        {/* <Route path="/signin">
          <Login setToken={setToken} />
        </Route>
        <Route path="/signup">
          <Signup />
        </Route>
        <Route path="/MyPost">
          <MyPost />
        </Route>
        <Route exact path="/profile">
          <Profile />
        </Route> */}
        <Route exact path="/upload">
          <div className="createPost">
            <CreatePost type1={type1} type2={type2} setFilter={setFilter}/>
          </div>
        </Route>
      </Switch>
    );
  };

  // if (!token) {
  //   return (
  //     <div>
  //       <div>
  //         <Router>
  //           <Switch>
  //             <Route path="/signin" exact>
  //               <Login setToken={setToken} />
  //             </Route>
  //             <Route path="/signup">
  //               <Signup />
  //             </Route>
  //           </Switch>
  //         </Router>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <>
      <Router>
          <NavBar filter={filter} setFilter={setFilter} />
          <Routing />
      </Router>
      </>
  );
}

export default App;
