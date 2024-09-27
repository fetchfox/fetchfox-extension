import { useMemo, useEffect, useState, useRef } from 'react';
import {
  getJob,
  getActiveJob,
} from '../lib/store.mjs';
import { findPagination } from '../lib/gather.mjs';

export const usePagination = (page) => {
  const [loading, setLoading] = useState(true);
  const [didInit, setDidInit] = useState(false);
  const [links, setLinks] = useState({});

  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!page?.url) return;

    setLoading(true);
    findPagination(page).then((result) => {
      cacheRef.current.set(page.url, result);
      setLoading(false);
      setDidInit(true);
      setLinks(result)
    });
  }, [page?.url]);

  return { loading, didInit, links };
}
