import { useMemo, useEffect, useState, useRef } from 'react';
import { getKey } from '../lib/store.mjs';
import { useActiveJob } from './jobs';
import { set } from 'radash';

export const useAutoSleepTime = () => {
  const [average, setAverage] = useState();
  const [times, setTimes] = useState();
  const [pretty, setPretty] = useState();
  const { job } = useActiveJob();

  const parse = (loadSleepTimes) => {
    console.log('autosleep update loadSleepTimes', job, loadSleepTimes);
    const times = [];
    for (const target of (job?.results?.targets || [])) {
      const hostname = (new URL(target.url)).hostname;
      if (loadSleepTimes[hostname]) {
        const values = (loadSleepTimes[hostname].times || []).map(parseFloat);
        times.push(...values);
      }
    }
    console.log('loadSleepTimes got times', times);

    if (times.length == 0) return;

    times.sort((a, b) => a - b);
    const lo = Math.round(times[Math.floor(times.length * 0.2)] / 1000);
    const hi = Math.round(times[Math.floor(times.length * 0.8)] / 1000);
    if (lo == hi) {
      setPretty(`~${lo} seconds`);
    } else {
      setPretty(`~${lo}-${hi} seconds`);
    }
    setAverage(times.reduce((acc, v) => acc + v, 0) / times.length);
    setTimes(times);
  }

  const update = (changes) => {
    if (changes.loadSleepTimes) {
      parse(changes.loadSleepTimes.newValue);
    }
  };

  useEffect(() => {
    if (!job?.id) return;

    getKey('loadSleepTimes').then(parse);
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, [job?.id]);

  return { average, times, pretty };
}

export const useMirror = (orig, setOrig) => {
  const [mirror, setMirror] = useState();

  useEffect(() => {
    if (mirror) return;
    setMirror(orig);
  }, [orig]);

  const timeoutRef = useRef();
  const delayedSet = (updates) => {
    const copy = {...orig};
    const run = (copy, setter) => {
      for (const [keys, val] of updates) {
        copy = set(copy, keys, val);
      }
      setter(copy);
    }
    run({...mirror}, setMirror);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(
      () => run({...orig}, setOrig),
      1000);
  }

  return [mirror, delayedSet];
}
