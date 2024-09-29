import {
  advanceRound,
  getRoundId,
  isActive
} from "../../old/src/lib/controller";
import { getActiveTab } from "../../old/src/lib/navigation";
import { setJobField, setJobResults, setStatus } from "../../old/src/lib/store";
import { splitUrls } from "../../old/src/lib/util";

const runJob = async (job, tabId) => {
  const roundId = await getRoundId();

  job = await maybeNameJob(job);
  if (!(await isActive(roundId))) return;

  await setStatus("Run job " + job.name, roundId, 1);

  let targets;
  let gatherShare = 0.25;

  const mergeTargets = (newTargets) => {
    // Merge with existing pagination results, if any
    const merged = [];
    const existing = job.results?.targets || [];
    const partialComplete =
      existing.filter((x) => x.status != "scraped").length > 0;
    for (const nt of newTargets) {
      const e = existing
        .filter((t) => t.url == nt.url)
        .filter((t) => t.text == nt.text)
        .filter((t) => t.status == "scraped");
      if (partialComplete && e.length > 0) {
        // Job is partially complete, and we already scraped this one. Skip it.
      } else {
        merged.push(nt);
      }
    }
    return merged;
  };

  if (job.urls.action == "manual") {
    gatherShare = 0;
    const manualTargets = splitUrls(job.urls.manualUrls).map((url) => ({
      url,
      text: "(manual)"
    }));
    targets = mergeTargets(manualTargets);
    await setJobResults(job.id, { targets });
  } else if (job.urls.action == "current") {
    const active = await getActiveTab();
    let url;
    if (active) {
      url = active.url;
      // Save it for next time, in case Chrome can't find it
      setJobField(
        job.id,
        "urls",
        Object.assign({}, job.urls, { currentUrl: url })
      );
    } else if (job.urls.currentUrl) {
      url = job.urls.currentUrl;
    }
    gatherShare = 0;

    if (job.urls.pagination?.follow) {
      const paginationTargets = [];
      for (const link of job.urls.pagination.links) {
        console.log("look at pagination link", link);
        const text =
          link.pageNumber == 0 ? "(current)" : `(page ${link.pageNumber})`;
        paginationTargets.push({ url: link.url, text });
      }
      targets = mergeTargets(paginationTargets);
      console.log("pagination gave targets:", targets);
    } else {
      targets = [{ url, text: "(current)" }];
    }

    await setJobResults(job.id, { targets });
  } else {
    gatherShare = 0.25;
    targets = await runGather(job, tabId, gatherShare);
    targets = targets.concat(job.results?.targets || []);
  }

  if (!(await isActive(roundId))) return;

  console.log("Call runScrape");
  await runScrape(
    job,
    targets.map((t) => t.url),
    gatherShare
  );
  if (!(await isActive(roundId))) return;

  console.log("all done, lets advance the round just in case");
  await advanceRound();
  await setStatus("Completed job " + job.name);
};

export default async function handler(req) {
  await runJob(req.body.job, req.body.tabId);
}
