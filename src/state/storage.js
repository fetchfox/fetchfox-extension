import { useEffect, useState } from "react";
import { useStorage } from "@plasmohq/storage/hook";
import { Storage } from "@plasmohq/storage";
// import { storage } from "../../../lib/extension";
import { getKey } from '../lib/store.mjs';

export const storage = new Storage({ area: 'local' });

export const useLocal = (key, initial) => {
  const [val, setVal] = useState(initial);
  const [isLoading, setIsLoading] = useState({ isLoading: true });
  const framework = useStorage({ key, instance: storage }, initial);

  // const setter = () => {
  //   console.log('TODO: setter');
  // };

  // useEffect(() => {
  //   getKey(key)
  //     .then((result) => {
  //       console.log('====== active result', key, result);
  //       setVal(result);
  //       setIsLoading(false);
  //     });
  // }, []);

  return framework;
  // return [val, setter, isLoading];

  // return { val, framework };
  // console.log('debug active', key, initial);
  // getKey(key)
  //   .then((result) => {
  //     console.log('debug active result:', key, result);
  //   });

  // return useStorage({ key, instance: storage }, initial);
}
