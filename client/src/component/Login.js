import { useState } from "react";
import { Link, useHistory } from "react-router-dom";
import api, { apiUrl } from "../api";

async function loginUser(credential) {
  return api.post(apiUrl("/login"), credential);
}

function Login({ setToken }) {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [userPass, setUserPass] = useState("");

  const onSubmit = async (e) => {
    const token = await loginUser({
      email,
      userPass,
    });
    history.push("/");
    setToken(token);
  };

  return (
    <div className="App">
      <div className="Login-container">
        <div className="Input">
          <h1>Login Portal</h1>
          <form onSubmit={onSubmit}>
            <input
              placeholder="Email"
              type="text"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="Password"
              onChange={(e) => setUserPass(e.target.value)}
            />
            <input
              className="sbt-btn"
              type="button"
              value="Login"
              onClick={onSubmit}
            />
          </form>
          <div className="line"></div>
          <Link className="btn-sgn" to="/signup">
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
