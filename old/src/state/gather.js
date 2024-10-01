import { useEffect, useRef, useState } from "react";
import { findPagination } from "../lib/gather";

export const usePagination = (page) => {
  const [loading, setLoading] = useState(true);
  const [didInit, setDidInit] = useState(false);
  const [links, setLinks] = useState({});

  const cacheRef = useRef(new Map());

  useEffect(() => {
    console.log("what the fuck is happening", page?.url);

    if (!page?.url) return;

    setLoading(true);
    findPagination(page).then((result) => {
      cacheRef.current.set(page.url, result);
      setLoading(false);
      setDidInit(true);
      setLinks(result);
    });
  }, [page?.url]);

  return { loading, didInit, links };
};
