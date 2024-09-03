import { useMemo, useEffect, useState } from 'react';
import { getGlobalError } from '../lib/errors.mjs';

export const useGlobalError = () => {
  const [globalError, setGlobalError] = useState();

  const update = (changes) => {
    if (changes.globalError) {
      setGlobalError(changes.globalError.newValue)
    }
  };

  useEffect(() => {
    getGlobalError().then(setGlobalError)
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, []);

  return globalError;
}
