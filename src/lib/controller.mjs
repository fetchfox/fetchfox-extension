import { useEffect, useState } from 'react';
import { stopActiveJob } from './store.mjs';

let listeners = [];

export const useRoundId = () => {
  const [roundId, setRoundId] = useState(null);

  const update = (changes) => {
    if (changes.roundId) {
      setRoundId(changes.roundId.newValue);
    }
  };

  useEffect(() => {
    getRoundId().then(setRoundId);
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, []);

  return roundId;
}

export const getRoundId = async () => {
  return chrome.storage.local.get('roundId').
    then(r => {
      console.log('round result', r);
      return r['roundId'] || 1;
    });
}

export const isActive = async (r) => {
  return r == await getRoundId();
}

export const addListener = async (f) => {
  if (listeners.includes(f)) {
    console.log('stop have it', f);
    return;
  }
  console.log('stop push');
  listeners.push(f);
  console.log('stop push ->', listeners);
}

export const removeListener = async (f) => {
  const index = listeners.indexOf(f);
  if (index == -1) return;
  listeners.splice(index, 1);
}

export const runStopListeners = () => {
  console.log('stop runStopListeners START', listeners);
  listeners.map(l => { l() });
  listeners = [];
  console.log('stop runStopListeners DONE');
}

export const advanceRound = async () => {
  console.log('stop advanceRound', listeners);

  const roundId = await getRoundId();

  const changes = {
    inFlight: 0,
    roundId: roundId + 1,
  };

  await chrome.storage.local.set(changes);

  runStopListeners();

  return stopActiveJob();
}
