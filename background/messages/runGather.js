import { getRoundId, isActive } from "../../old/src/lib/controller";
import { cleanLinks, dedupeLinks, parseLinks } from "../../old/src/lib/gather";
import {
  getActiveTab,
  getPageData,
  getTabData
} from "../../old/src/lib/navigation";
import {
  setJobResults,
  setPercent,
  setScrapeStatus,
  setStatus
} from "../../old/src/lib/store";
import { splitUrls } from "../../old/src/lib/util";
import { maybeNameJob } from "../shared";

const runGather = async (job, tabId, percentFactor) => {
  if (!percentFactor) percentFactor = 1;
  const roundId = await getRoundId();
  await setStatus("Start job", roundId, 1);
  await setPercent(0.01);
  job = await maybeNameJob(job);

  console.log("runGather got tabId:", tabId);

  let tabUrl;
  if (tabId) {
    const activeTab = await getActiveTab();
    tabUrl = activeTab?.url;
  }

  const urlsList = splitUrls(job.urls.url);

  console.log("urlsList", urlsList);
  let links = [];
  for (let i = 0; i < urlsList.length; i++) {
    const url = urlsList[i];
    console.log("gather from url:", url);
    if (!url) continue;

    if (!(await isActive(roundId))) return [null, null, null];

    setStatus("Crawl URLs from " + url);

    let page;

    console.log("gather current tab?", tabId, tabUrl, url);

    if (tabId && tabUrl == url) {
      page = await getTabData(tabId, { shouldClose: false });
    } else {
      page = await getPageData(url, {
        active: job.scrape?.concurrency < 0,
        sleepTime: job.scrape?.sleepTime
      });
    }

    console.log("gather got page:", page);

    if (page?.error) {
      console.error("Error, skipping" + url, page?.error);
      await setScrapeStatus(job.id, roundId, [url], "error");
      continue;
    }

    const factor = (i + 1) / urlsList.length;
    const partial = await parseLinks(
      page,
      job.urls.question,
      (targets, percent) => {
        console.log("changes percent cb", targets, percent);
        setJobResults(job.id, { targets });
        setPercent(percent * percentFactor * factor);
      }
    );

    console.log("got partial", partial);

    if (partial) {
      links = cleanLinks(dedupeLinks(links.concat(partial)));
      setJobResults(job.id, { targets: links });
      console.log("links is now:", links);
    }
  }

  console.log("links:", links);

  setStatus("AI found URLs:\n" + JSON.stringify(links, null, 2), roundId, -1);
  if (percentFactor == 1) setPercent(null);

  return links;
};

export default async function handler(req) {
  runGather(req.body.job, req.body.tabId);
}
