import React from 'react';
import { createRoot } from 'react-dom/client';

import Popup from './Popup';
import './index.css';
import icon34 from '../../assets/img/icon-34.png';

import { initSentry } from '../../lib/errors.mjs';
initSentry();

let iconInterval;

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inFlight) {
    if (changes.inFlight.newValue == 0) {
      if (iconInterval) {
        clearInterval(iconInterval);
        iconInterval = null;
      }
      chrome.action.setIcon({ path: icon34 });
    } else if (iconInterval == null) {
      const context = document.createElement('canvas').getContext('2d');
      const start = new Date();
      const lines = 16;
      const cW = 40;
      const cH = 40;

      iconInterval = setInterval(() => {
        const rotation = parseInt(((new Date() - start) / 1000) * lines) / lines;
        context.save();
        context.clearRect(0, 0, cW, cH);
        context.translate(cW / 2, cH / 2);
        context.rotate(Math.PI * 2 * rotation);
        for (var i = 0; i < lines; i++) {
          context.beginPath();
          context.rotate(Math.PI * 2 / lines);
          context.moveTo(cW / 10, 0);
          context.lineTo(cW / 4, 0);
          context.lineWidth = cW / 30;
          context.strokeStyle = 'rgba(0, 0, 0,' + i / lines + ')';
          // context.strokeStyle = 'rgba(223, 101, 70,' + i / lines + ')';
          context.stroke();
        }
        const imageData = context.getImageData(10, 10, 19, 19);
        console.log('set icon', imageData);
        chrome.action.setIcon({ imageData });
        context.restore();
      }, 1000/30);
    }
  }
});

(() => {
  const devMode = !('update_url' in chrome.runtime.getManifest());
  if (devMode) return;

  for (const key of ['log', 'warn', 'error']) {
    const original = console[key];
    console[key] = (...args) => {
      chrome.runtime.sendMessage({
        action: 'console',
        key,
        args,
      });
      original(...args);
    };
  }
})();

const container = document.getElementById('app-container');
const root = createRoot(container);
root.render(
  <div className="App">
    <Popup />
  </div>
);
