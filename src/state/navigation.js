import React, { useState, useEffect, useRef } from 'react';
import { getTabData } from '../lib/navigation.mjs';

export const useActivePage = () => {
  const [page, setPage] = useState();

  useEffect(() => {
    // TODO: update on navigation
    getTabData()
      .then(resp => {
        console.log('use active page resp', resp);
        setPage(resp);
      });
  }, []);

  return page;
}
