import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./Popup";
import "./index.css";
import { webExtension } from "~old/src/lib/browser";
import { initSentry } from "../../lib/errors";
import { sendToBackground } from "@plasmohq/messaging";

initSentry();

(() => {
  const devMode = !("update_url" in chrome.runtime.getManifest());
  if (devMode) return;

  for (const key of ["log", "warn", "error"]) {
    const original = console[key];
    console[key] = (...args) => {
      sendToBackground({
        name: "console",
        body: {
          key,
          args,
        },
      });
      original(...args);
    };
  }
})();

const container = document.getElementById("app-container");
const root = createRoot(container);
root.render(
  <div className="App">
    <Popup />
  </div>
);
