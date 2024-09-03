import React, { useState, useEffect } from 'react';
import { Scrape } from '../../components/scrape/Scrape';

const Popup = () => {
  return (
    <div style={{ width: 500}}>
      <Scrape isPopup />
    </div>
  );
}

export default Popup;
