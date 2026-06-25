import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[KooraPlays] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[KooraPlays] Service worker registration failed:", err);
      });
  });
}
