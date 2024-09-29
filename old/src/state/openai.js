import { useMemo, useEffect, useState } from 'react';
import { getModel, getAvailableModels } from '../lib/ai';
import { getKey } from '../lib/store';
import { useRoundId } from '../lib/controller';
import OpenAI from 'openai';

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
};

export const useOpenAiModels = () => {
  const [model, setModel] = useState();
  const [available, setAvailable] = useState([]);
  const openai = useOpenAiKey();

  useEffect(() => {
    getAvailableModels().then(setAvailable);
    getModel().then(setModel);
  }, [openai.key]);

  return { model, available };
};

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
    getKey(key).then((u) => setUsage(u || {}));
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, [roundId]);

  return usage;
};

export const useQuota = () => {
  const [quota, setQuota] = useState({ ok: true });
  const openai = useOpenAiKey();
  const models = useOpenAiModels();

  useEffect(() => {
    if (!openai?.key) return;
    if (!models?.model) return;

    if (openai?.plan == 'free') {
      setQuota({ credits: 1, ok: true });
      return;
    }

    const client = new OpenAI({
      apiKey: openai.key,
      dangerouslyAllowBrowser: true,
    });

    // There's no endpoint for quota available, so just run
    // a test prompt
    client.chat.completions
      .create({
        model: models.model,
        messages: [{ role: 'user', content: 'test' }],
      })
      .then((resp) => {
        setQuota({ credits: 1, ok: true });
      })
      .catch((err) => {
        if (err.code == 'insufficient_quota') {
          setQuota({ credits: 0, error: err, ok: false });
        } else {
          setQuota({ error: err, ok: false });
        }
      });
  }, [openai?.plan, openai?.key, models?.model]);

  return quota;
};
