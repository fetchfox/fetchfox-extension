import { useMemo, useEffect, useState } from 'react';
import { getModel, getAvailableModels } from '../lib/ai.mjs';

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

export const useOpenAiModels = () => {
  const [model, setModel] = useState();
  const [available, setAvailable] = useState([]);
  const openai = useOpenAiKey();

  useEffect(() => {
    getAvailableModels().then(setAvailable);
    getModel().then(setModel);
  }, [openai.key]);

  return { model, available };
}
