import { webExtension } from "~old/src/lib/browser";

import icon34 from "data-base64:~assets/icon-34.png";
import { storage } from "../lib/extension";
import { initSentry } from "~old/src/lib/errors";
import { saveConsole } from "~background/shared";

initSentry();

console.log("background script installed");

let iconInterval;

storage.watch({
  inFlight: (c) => {
    if (c.newValue === 0) {
      if (iconInterval) {
        clearInterval(iconInterval);
        iconInterval = null;
      }
      chrome.action.setIcon({ path: icon34 });
    } else if (iconInterval === null) {
      const context = new OffscreenCanvas(100, 100).getContext("2d");
      if (!context) return;

      const start = Date.now();
      const lines = 16;
      const cW = 40;
      const cH = 40;

      iconInterval = setInterval(() => {
        const rotation = (((Date.now() - start) / 1000) * lines) / lines;
        context.save();
        context.clearRect(0, 0, cW, cH);
        context.translate(cW / 2, cH / 2);
        context.rotate(Math.PI * 2 * rotation);
        for (var i = 0; i < lines; i++) {
          context.beginPath();
          context.rotate((Math.PI * 2) / lines);
          context.moveTo(cW / 10, 0);
          context.lineTo(cW / 4, 0);
          context.lineWidth = cW / 30;
          context.strokeStyle = "rgba(0, 0, 0," + i / lines + ")";
          // context.strokeStyle = 'rgba(223, 101, 70,' + i / lines + ')';
          context.stroke();
        }
        const imageData = context.getImageData(10, 10, 19, 19);
        chrome.action.setIcon({ imageData });
        context.restore();
      }, 1000 / 30);
    }
  },
});

function installConsoleHooks() {
  const devMode = !("update_url" in chrome.runtime.getManifest());
  if (devMode) return;

  ["log", "warn", "error"].forEach((key) => {
    const original = console[key];
    console[key] = (...args) => {
      original(...args);
      saveConsole(key, args);
    };
  });
}

installConsoleHooks();
