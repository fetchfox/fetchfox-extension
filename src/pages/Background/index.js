import { GATHER_TARGETS_PROMPT, EXAMPLE_LINKS } from '../../lib/constants.mjs';
import { sleep, splitUrls } from '../../lib/util.mjs';
import { exec } from '../../lib/ai.mjs';
import {
  setKey,
  nextId,
  saveJob,
  getActiveJob,
  setJobField,
  setActiveJob,
  setJobResults,
  setStatus,
  setPercent,
  setScrapeStatus,
  setScrapeAnswer,
  pushConsole,
} from '../../lib/store.mjs';
import { getPageData, getTabData, getActiveTab, reportSleep } from '../../lib/navigation.mjs';
import { parseLinks, cleanLinks, dedupeLinks } from '../../lib/gather.mjs';
import { scrapePage } from '../../lib/scrape.mjs';
import { getRoundId, isActive, runStopListeners, advanceRound } from '../../lib/controller.mjs';
import { nameTemplate } from '../../lib/templates.mjs';
import { sendReport } from '../../lib/report.mjs';


chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  if (req.action != 'console') console.log('bg got message:', req);

  if (req.action == 'runJob') runJob(req.job, req.tabId);
  else if (req.action == 'runGather') runGather(req.job, req.tabId);
  else if (req.action == 'runScrape') runScrape(req.job, req.urls);
  else if (req.action == 'stop') runStopListeners();

  else if (req.action == 'checkLoading') {
    checkLoading(req.text, req.html).then(sendResponse);
    return true;
  }

  if (req.action == 'reportSleep') {
    reportSleep(req.url, req.msec);
  }

  else if (req.action == 'setStatus') {
    setStatus(req.message);
  }

  else if (req.action == 'console') {
    saveConsole(req.key, req.args);
  }

  else if (req.action == 'reportBug') {
    reportBug().then(sendResponse);
    return true;
  }

  else if (req.action == 'nextId') {
    nextId().then(sendResponse);
    return true;
  }
});

const runJob = async (job, tabId) => {
  const roundId = await getRoundId();

  job = await maybeNameJob(job);
  if (!await isActive(roundId)) return;

  await setStatus('Run job ' + job.name, roundId, 1);

  let targets;
  let gatherShare = 0.25;
  let scrapeUrls = []
  if (job.urls.action == 'manual') {
    console.log('HANDLE MANUAL URLS STEP', job);

    gatherShare = 0;

    targets = splitUrls(job.urls.manualUrls)
      .map(url => ({ url, text: '(manual)' }));
    await setJobResults(job.id, { targets })

  } else {
    gatherShare = 0.25;
    targets = await runGather(job, tabId, gatherShare);
    targets = targets.concat(job.results?.targets || []);
  }

  // const links = 
  if (!await isActive(roundId)) return;
  // console.log('got links:', links);

  await runScrape(
    job,
    targets.map(t => t.url),
    gatherShare);
  if (!await isActive(roundId)) return;

  console.log('all done, lets advance the round just in case');
  await advanceRound();
  await setStatus('Completed job ' + job.name);
}

const maybeNameJob = async (job) => {
  if (job.name.indexOf('Untitled') != -1 || job.name.indexOf('undefined') != -1) {
    const name = '' + (await runGetName(job));

    console.log('maybeNameJob got name:', name);

    job.name = name;
    await saveJob(job);
  }
  return job;
}

const runGetName = async (job) => {
  const slim = {};
  slim.scrape = job.scrape;
  slim.urls = job.urls;
  return exec('name', { job: JSON.stringify(slim, null, 2) })
    .then(x => x.name);
};

const runGather = async (job, tabId, percentFactor) => {
  if (!percentFactor) percentFactor = 1;
  const roundId = await getRoundId();
  await setStatus('Start job', roundId, 1);
  await setPercent(0.01);
  job = await maybeNameJob(job);

  console.log('runGather got tabId:', tabId);

  let tabUrl;
  if (tabId) {
    const activeTab = await getActiveTab();
    tabUrl = activeTab?.url;
  }

  const urlsList = splitUrls(job.urls.url);

  console.log('urlsList', urlsList);
  let links = [];
  for (let i = 0; i < urlsList.length; i++) {
    const url = urlsList[i];
    console.log('gather from url:', url);
    if (!url) continue;

    if (!await isActive(roundId)) return [null, null, null];

    setStatus('Crawl URLs from ' + url);

    let page;

    console.log('gather current tab?', tabId, tabUrl, url);

    if (tabId && tabUrl == url) {
      page = await getTabData(tabId, { shouldClose: false });
    } else {
      page = await getPageData(
        url,
        {
          active: job.scrape?.concurrency < 0,
          sleepTime: job.scrape?.sleepTime,
        });
    }

    console.log('gather got page:', page);

    if (page.error) {
      console.log('Error, skipping' + url, page.error);
      await setScrapeStatus(job.id, roundId, [url], 'error');
      continue;
    }

    const factor = (i + 1) / urlsList.length;
    const partial = await parseLinks(
      page,
      job.urls.question,
      (targets, percent) => {
        console.log('changes percent cb', targets, percent);
        setJobResults(job.id, { targets });
        setPercent(percent * percentFactor * factor);
      });

    console.log('got partial', partial);

    if (partial) {
      links = cleanLinks(dedupeLinks(links.concat(partial)));
      setJobResults(job.id, { targets: links });
      console.log('links is now:', links);
    }
  }

  console.log('links:', links);

  setStatus('AI found URLs:\n' + JSON.stringify(links, null, 2), roundId, -1);
  if (percentFactor == 1) setPercent(null);

  return links
};

const checkLoading = async (text, html) => {
  const job = await getActiveJob();
  console.log('checkLoading for', text, html);
  const answer = await exec(
    'checkLoading',
    {
      text: text.substr(0, 10000),
      html: html.substr(0, 30000),
      questions: JSON.stringify(job.scrape?.questions || []),
    });
  console.log('checkLoading resp', answer);
  return { status: 'ok', answer };
}

const runScrape = async (job, urls, percentAdd) => {
  if (!percentAdd) percentAdd = 0;
  console.log('bg got runscrape', job, urls);

  job = await maybeNameJob(job);

  const usingActive = (job.scrape?.concurrency || 0) < 0;

  const roundId = await getRoundId();
  const maxConc = Math.abs(job.scrape?.concurrency || 3);

  console.log('bg running with maxConc', maxConc);

  await setStatus(
    'Queue ' + (urls.length == 1 ? urls[0] : urls.length + ' URLs'),
    roundId,
    urls.length);

  await setScrapeStatus(
    job.id,
    roundId,
    urls,
    'queued');

  const extraRules = (job.urls.action == 'gather'
    ? 'Important: For this scrape, ONLY find exactly 1 item. So itemCount will always be 1, and you will return only 1 result after that.'
    : '');

  const itemDescription = (job.urls.action == 'manual'
    ? job.urls.question
    : '');

  const fn = async (url, index, cb) => {
    console.log('bg runscrape got url', next, url);
    await setScrapeStatus(job.id, roundId, [url], 'scraping');

    if (!await isActive(roundId)) return [null, null, null];
    console.log('bg runscrape getting page data', url);

    let timeoutId;
    const options = {
      active: job.scrape?.concurrency < 0,
      sleepTime: job.scrape?.sleepTime,
      onCreate: (tab) => {
        timeoutId = setTimeout(
          () => {
            try { chrome.tabs.remove(tab.id) } catch(e) {};
          },
          15*1000);
      }
    };
    const page = await getPageData(url, options);

    if (timeoutId) clearTimeout(timeoutId);

    console.log('bg runscrape got page data', url, page);

    if (page.error) {
      return [index, url, { error: page.error }];
    }

    if (!await isActive(roundId)) return [null, null, null];
    console.log('bg runscrape scraping', url);
    let result;
    try {
      result = await scrapePage(
        page,
        job.scrape.questions,
        itemDescription,
        extraRules,
        cb);
    } catch(e)  {
      console.error('scrapePage gave error:', e);
      throw e;
    }
    console.log('bg runscrape scraped', url, result);

    if (!await isActive(roundId)) return [null, null, null];

    return [index, url, result];
  };

  let next = 0;
  let done = 0;

  let p = [];

  while (next <= urls.length) {
    for (let i = p.filter(x => !!x).length; i < maxConc && next < urls.length; i++) {
      const url = urls[next++];
      const index = p.length;
      console.log('bg nnn runscrape start:', next, index, url);
      p.push(fn(
        url,
        index,
        (partialItems) => {
          setScrapeAnswer(job.id, url, partialItems);
        }));
      if (usingActive) await sleep(2000);
    }

    console.log('bg nnn runscrape wait for any', next, urls.length, p);
    const l = p.filter(x => !!x);
    if (l.length == 0) break;
    let [doneIndex, url, result] = [null, null, null];
    console.log('Promise.any', l);
    [doneIndex, url, result] = await Promise.any(l);

    if (doneIndex === null) break;

    console.log('bg nnn runscrape got completed:', doneIndex);
    console.log('bg runscrape setting results/status', url);

    done++;

    if (result.error) {
      await setScrapeStatus(job.id, roundId, [url], 'error');
    } else {
      await setScrapeStatus(job.id, roundId, [url], 'scraped');
      await setScrapeAnswer(job.id, url, result);
    }
    await setStatus(
      (result.error ? 'Error' : 'Scraped') +
      ' (' + next + '/' + urls.length + ') ' + url, roundId,  -1);
    await setPercent(
      percentAdd + ((done / urls.length) * (1 - percentAdd)),
      done,
      urls.length,
    );

    p[doneIndex] = null;
  }

  setPercent(null);
}

const consoleMessages = [];
const saveConsole = (key, args) => {
  // Do not put any console.log() statements in here

  const message = [
    '' + (new Date()),
    key,
    JSON.stringify(args),
  ].join('\t').substr(0, 5000); // max 5kB per message
  consoleMessages.push(message);

  const l = consoleMessages.length;
  const max = 100000;
  if (l > max) {
    consoleMessages = consoleMessages.slice(l - max);
  }
}

(() => {
  const devMode = !('update_url' in chrome.runtime.getManifest());
  if (devMode) return;

  for (const key of ['log', 'warn', 'error']) {
    console.log('Replace bg console', key);
    const original = console[key];
    console[key] = (...args) => {
      original(...args);
      saveConsole(key, args);
    };
  }
})();

const reportBug = async () => {
  return sendReport(consoleMessages.join('\n'));
}
