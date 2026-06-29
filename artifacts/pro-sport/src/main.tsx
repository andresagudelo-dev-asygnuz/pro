import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Register Service Worker for PWA functionality
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[PRO PWA] Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PRO PWA] Service Worker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
