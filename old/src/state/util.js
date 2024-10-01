import { useStorage } from "@plasmohq/storage/hook";
import { sum } from "radash";
import { useMemo } from "react";
import { useActiveJob } from "./jobs";

export const useAutoSleepTime = () => {
  const job = useActiveJob();
  const [loadSleepTimes] = useStorage("loadSleepTimes");

  return useMemo(() => {
    const times = (job?.results?.targets || [])
      .flatMap((target) => {
        const hostname = new URL(target.url).hostname;
        return loadSleepTimes[hostname]?.times || [];
      })
      .map(parseFloat);

    console.log("loadSleepTimes got times", times);

    if (times.length === 0) return {};

    times.sort();

    const lo = Math.round(times[Math.floor(times.length * 0.2)] / 1000);
    const hi = Math.round(times[Math.floor(times.length * 0.8)] / 1000);
    const seconds = lo === hi ? lo : `${lo}-${hi}`;
    const pretty = `~${seconds} seconds`;
    const average = sum(times) / times.length;

    return { pretty, average, times };
  }, [loadSleepTimes, job]);
};
