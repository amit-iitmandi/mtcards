import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { warmCatalogue } from "./utils/catalogue";
import reportWebVitals from "./reportWebVitals";
import 'bootstrap/dist/css/bootstrap.css';
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import './fonts/Ruda-Bold.ttf';
import './fonts/Ruda-Black.ttf';
import './fonts/Ruda-ExtraBold.ttf';
import './fonts/Ruda-Medium.ttf';
import './fonts/Ruda-Regular.ttf';
import './fonts/Ruda-SemiBold.ttf';

try {
  warmCatalogue();
} catch {
  // Let the catalogue show its normal configuration error.
}

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

// Ask existing installations to pick up the retirement worker promptly.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const workerPath = '/card-image-worker.js';
  const serviceWorkers = navigator.serviceWorker;
  if (serviceWorkers.controller?.scriptURL === new URL(workerPath, location.origin).href) {
    serviceWorkers.addEventListener('controllerchange', () => {
      // A page opened under the old worker may already have failed image requests.
      for (const photo of document.images) {
        if (photo.complete && photo.naturalWidth === 0 &&
            photo.currentSrc.startsWith('https://res.cloudinary.com/')) photo.src = photo.currentSrc;
      }
    }, { once: true });
    serviceWorkers.getRegistration().then(registration => registration?.update()).catch(() => {});
  }
}
