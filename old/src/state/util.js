import { useStorage } from "@plasmohq/storage/hook";
import { useEffect, useState } from "react";
import { getKey } from "../lib/store";
import { useActiveJob } from "./jobs";

export const useAutoSleepTime = () => {
  const [average, setAverage] = useState();
  const [times, setTimes] = useState();
  const [pretty, setPretty] = useState();
  const job = useActiveJob();

  const [loadSleepTimes] = useStorage("loadSleepTimes");

  useEffect(() => {
    const times = [];
    for (const target of job?.results?.targets || []) {
      const hostname = new URL(target.url).hostname;
      if (loadSleepTimes[hostname]) {
        const values = (loadSleepTimes[hostname].times || []).map(parseFloat);
        times.push(...values);
      }
    }
    console.log("loadSleepTimes got times", times);

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
  }, [loadSleepTimes]);

  return { average, times, pretty };
};
