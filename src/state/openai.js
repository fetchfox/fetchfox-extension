import { useMemo, useEffect, useState } from 'react';
import { getModel, getAvailableModels } from '../lib/ai.mjs';
import { getKey } from '../lib/store.mjs';
import { useRoundId } from '../lib/controller.mjs';

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

export const useUsage = () => {
  const roundId = useRoundId();
  const [usage, setUsage] = useState({});

  const update = (changes) => {
    const key = 'roundUsage_' + roundId;
    if (changes[key]) {
      setUsage(changes[key].newValue);
    }
  };

  useEffect(() => {
    if (!roundId) return;
    const key = 'roundUsage_' + roundId;
    getKey(key).then(u => setUsage(u || {}));
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, [roundId]);

  return usage;
}
