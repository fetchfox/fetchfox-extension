import { useMemo, useEffect, useState } from 'react';

export const useOpenAiKey = () => {
  const [key, setKey] = useState();
  const [plan, setPlan] = useState();
  const [loading, setLoading] = useState(true);

  const update = () => {
    chrome.storage.local.get().then((st) => {
      setKey(st.openAiKey);
      setPlan(st.openAiPlan);
      setLoading(false);
    });
  };

  useEffect(() => {
    update();
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, []);

  return { key, plan, loading };
}
