import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function signing(credential) {
  return axios.post("/register", credential);
}

function Signup() {
  const [userName, setUserName] = useState("");
  const [userPass, setUserPass] = useState("");
  const [userConPass, setUserConPass] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    await signing({
      userName,
      userPass,
      userEmail,
    });
    // adduser();
  };
  return (
    <div className="App">
      <div className="Login-container">
        <div className="Input">
          <h1>Signup Portal</h1>
          <form onSubmit={onSubmit}>
            <input placeholder="Username" type="text" onChange={(e) => setUserName(e.target.value)} />
            <input placeholder="Email" type="text" onChange={(e) => setUserEmail(e.target.value)} />
            <input
              placeholder="Password"
              type="Password"
              onChange={(e) => setUserPass(e.target.value)}
            />
            <input
              placeholder="Confirm Password"
              type="Password"
              onChange={(e) => setUserConPass(e.target.value)}
            />
          <input className="sbt-btn" type="button" value="Signup" onClick={onSubmit} />
          </form>
          <div className="line"></div>

          <Link className="btn-sgn" to="/signin">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
