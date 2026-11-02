import React, { BrowserRouter as Router } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import 'bootstrap/dist/css/bootstrap.css';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './fonts/Ruda-Bold.ttf';
import './fonts/Ruda-Black.ttf';
import './fonts/Ruda-ExtraBold.ttf';
import './fonts/Ruda-Medium.ttf';
import './fonts/Ruda-Regular.ttf';
import './fonts/Ruda-SemiBold.ttf';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
