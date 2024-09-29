import Browser from "webextension-polyfill";

import { getRoundId, isActive } from "../../old/src/lib/controller";
import { getPageData } from "../../old/src/lib/navigation";
import { scrapePage } from "../../old/src/lib/scrape";
import {
  setPercent,
  setScrapeAnswer,
  setScrapeStatus,
  setStatus
} from "../../old/src/lib/store";
import { sleep } from "../../old/src/lib/util";
import { maybeNameJob } from "../shared";

const runScrape = async (job, urls, percentAdd) => {
  if (!percentAdd) percentAdd = 0;
  console.log("bg got runscrape", job, urls);

  job = await maybeNameJob(job);

  const usingActive = (job.scrape?.concurrency || 0) < 0;

  const roundId = await getRoundId();
  const maxConc = Math.abs(job.scrape?.concurrency || 3);

  console.log("bg running with maxConc", maxConc);

  await setStatus(
    "Queue " + (urls.length == 1 ? urls[0] : urls.length + " URLs"),
    roundId,
    urls.length
  );

  await setScrapeStatus(job.id, roundId, urls, "queued");

  const extraRules =
    job.urls.action == "gather"
      ? "Important: For this scrape, ONLY find exactly 1 item. So itemCount will always be 1, and you will return only 1 result after that."
      : "";

  const itemDescription = job.urls.action == "manual" ? job.urls.question : "";

  const fn = async (url, index, cb) => {
    console.log("bg runscrape got url", next, url);
    await setScrapeStatus(job.id, roundId, [url], "scraping");

    if (!(await isActive(roundId))) return [null, null, null];
    console.log("bg runscrape getting page data", url);

    let timeoutId;
    const options = {
      active: job.scrape?.concurrency < 0,
      sleepTime: job.scrape?.sleepTime,
      onCreate: (tab) => {
        timeoutId = setTimeout(() => {
          try {
            Browser.tabs.remove(tab.id);
          } catch (e) {}
        }, 15 * 1000);
      }
    };
    const page = await getPageData(url, options);

    if (timeoutId) clearTimeout(timeoutId);

    console.log("bg runscrape got page data", url, page);

    if (page.error) {
      return [index, url, { error: page.error }];
    }

    if (!(await isActive(roundId))) return [null, null, null];
    console.log("bg runscrape scraping", url);
    let result;
    try {
      result = await scrapePage(
        page,
        job.scrape.questions,
        job.urls?.perPage,
        itemDescription,
        extraRules,
        cb
      );
    } catch (e) {
      console.error("scrapePage gave error:", e);
      throw e;
    }
    console.log("bg runscrape scraped", url, result);

    if (!(await isActive(roundId))) return [null, null, null];

    return [index, url, result];
  };

  let next = 0;
  let done = 0;

  let p = [];

  while (next <= urls.length) {
    for (
      let i = p.filter((x) => !!x).length;
      i < maxConc && next < urls.length;
      i++
    ) {
      const url = urls[next++];
      const index = p.length;
      console.log("bg nnn runscrape start:", next, index, url);
      p.push(
        fn(url, index, ({ items, percent }) => {
          console.log("partial partialItems", items, percent);
          setScrapeAnswer(job.id, url, items);

          if (percent) {
            setPercent(percent, 0, 1);
          }
        })
      );
      if (usingActive) await sleep(2000);
    }

    console.log("bg nnn runscrape wait for any", next, urls.length, p);
    const l = p.filter((x) => !!x);
    if (l.length == 0) break;
    let [doneIndex, url, result] = [null, null, null];
    console.log("Promise.any", l);
    [doneIndex, url, result] = await Promise.any(l);

    if (doneIndex === null) break;

    console.log("bg nnn runscrape got completed:", doneIndex);
    console.log("bg runscrape setting results/status", url);

    done++;

    if (result.error) {
      await setScrapeStatus(job.id, roundId, [url], "error");
    } else {
      await setScrapeStatus(job.id, roundId, [url], "scraped");
      await setScrapeAnswer(job.id, url, result);
    }

    await setStatus(
      (result.error ? "Error" : "Scraped") +
        " (" +
        next +
        "/" +
        urls.length +
        ") " +
        url,
      roundId,
      -1
    );

    await setPercent(
      percentAdd + (done / urls.length) * (1 - percentAdd),
      done,
      urls.length
    );

    p[doneIndex] = null;
  }

  setPercent(null);
};

export default async function handler(req) {
  await runScrape(req.body.job, req.body.tabId);
}
