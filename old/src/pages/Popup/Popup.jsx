import React, { useState, useEffect } from 'react';
import { Scrape } from '../../components/scrape/Scrape';

console.log('Replace console log');
const original = console;
console = Object.assign(
  {},
  {
    log: (...args) => {
      original.log('INTERCEPTED', args);
    }
  },
  original);
  

const Popup = () => {
  return (
    <div style={{ width: 500}}>
      <Scrape isPopup />
    </div>
  );
}

export default Popup;
