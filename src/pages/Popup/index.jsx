import React from 'react';
import { createRoot } from 'react-dom/client';

import Popup from './Popup';
import './index.css';

import store from '../../store/rstore.mjs';
import { Provider } from 'react-redux';

console.log('Popup Bg register onMessage.addListener');
chrome.runtime.onMessage.addListener(async function (req, sender, sendResponse) {
  console.log('Popup Bg got message', req, sender);
});

const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <Provider store={store}>
    <div className="App">
      <Popup />
    </div>
  </Provider>
);
