import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Unregister any existing service workers to prevent stale cache issues
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

console.log("main.tsx loaded");

try {
  const rootElement = document.getElementById("root");
  console.log("Root element:", rootElement);
  
  if (!rootElement) {
    document.body.innerHTML = "<div style='padding:20px;color:red;'>ERROR: No root element found!</div>";
  } else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <BrowserRouter basename="/app">
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log("App rendered successfully");
  }
} catch (e) {
  console.error("Render error:", e);
  document.body.innerHTML = 
    "<div style='padding:20px;background:#fee;color:red;min-height:100vh;'><h1>Render Error</h1><pre>" + (e as Error).message + "</pre></div>";
}
