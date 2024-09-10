import React from 'react';
import { createRoot } from 'react-dom/client';

import Popup from './Popup';
import './index.css';

(() => {
  const devMode = !('update_url' in chrome.runtime.getManifest());
  if (devMode) return;

  for (const key of ['log', 'warn', 'error']) {
    console.log('Replace console', key);
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
