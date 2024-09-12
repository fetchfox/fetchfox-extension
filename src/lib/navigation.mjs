import { setStatus, setKey } from './store.mjs';
import { getRoundId, isActive, addListener, removeListener } from './controller.mjs';
import { sleep } from './util.mjs';
import { getTabUrl, closeTabIfExists } from './browser.mjs';

const loadSleepTimes = {};

const maxPageAttempts = 2;
const maxTabAttempts = 3;

export const getPageData = async (url, options) => {
  console.log('get page data got options (sleep)', options);

  const roundId = await getRoundId();

  let result;
  for (let i = 0; i < maxPageAttempts; i++) {
    if (!await isActive(roundId)) return;

    result = await getPageDataIteration(url, options);
    if (!result || result.error) {
      console.error(`Got page data error ${url} (${i}/${maxPageAttempts}):`, result);
      await sleep(2000);
      continue;
    } else {
      return result;
    }
  }
  return result?.error ? result : { error: `Could not get page data for ${url}` };
}

const getPageDataIteration = async (url, options) => {
  const { active, onCreate, sleepTime } = options || {};
  const tabWithUrl = await getTabWithUrl(url);
  if (tabWithUrl) {
    return getTabData(tabWithUrl.id, { shouldClose: false, sleepTime });
  }

  let tab;
  if (active) {
    tab = await chrome.tabs.create({ url, active: true });

    // if (activeTab) {
    //   tab = await chrome.tabs.update(activeTab.id, { url });
    // } else {
    //   tab = await chrome.tabs.create({ url, active: true });
    // }
  } else {
    tab = await chrome.tabs.create({ url, active: false });
  }

  if (onCreate) onCreate(tab);

  let handleStop;
  let errorHandleStop;
  let error;

  const errorLoad = new Promise((ok, bad) => {
    const listener = chrome.webNavigation.onErrorOccurred.addListener((details) => {
      if (details.tabId === tab.id) {
        if (details.frameType == 'outermost_frame') {
          error = details;
          ok('error');
        }
      }
    });

    errorHandleStop = () => {
      chrome.webNavigation.onErrorOccurred.removeListener(listener);
      if (!active) closeTabIfExists(tab.id);
    }
    addListener(errorHandleStop);
  });

  const pageLoad = new Promise((ok, bad) => {
    const listener = chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (tabId == tab.id && info.status == 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        ok('ok');
      }
    });

    handleStop = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      if (!active) closeTabIfExists(tab.id);
    }
    addListener(handleStop);
  });

  const outcome = await Promise.any([pageLoad, errorLoad]);
  setStatus('Loaded (' + outcome + ') ' + url);
  removeListener(handleStop);

  let results;
  if (!error) {
    results = await getTabData(tab.id, { shouldClose: true, sleepTime });
    if (!results) {
      error = 'No tab results';
    }
  }

  if (error) {
    if (!active) closeTabIfExists(tab.id);
    return { error };
  }

  return results;
}

export const getTabData = async (tabId, options) => {
  const roundId = await getRoundId();

  const { shouldClose, sleepTime } = options || {};

  console.log('get tab data got options (sleep)', options);

  if (!tabId) {
    tabId = (await getActiveTab()).id;
  }
  let url = await getTabUrl(tabId);

  const handleStop = () => {
    if (shouldClose) closeTabIfExists(tabId);
  }
  addListener(handleStop);

  let results;
  // Retry a few times, mainly for redirects
  for (let i = 0; i < maxTabAttempts; i++) {
    if (!await isActive(roundId)) return;

    // get the html + text
    console.log('=> Inject:', tabId, i);
    url = await getTabUrl(tabId);
    if (!url) {
      console.warn(`No URL found when trying to get tab data for ${tabId}`);
    }

    console.log('Got sleep time:', sleepTime);
    let args;
    if (sleepTime && !isNaN(Number(sleepTime))) {
      console.log('Using given sleep time:', sleepTime);
      args = [Number(sleepTime), false];
    } else {
      console.log('Auto suggesting sleep time');
      args = suggestSleep(url);
    }
    console.log('sleep args', tabId, args);

    const frames = await new Promise((ok) => {
      chrome.webNavigation.getAllFrames(
        { tabId },
        (frames) => {
          ok(frames);
        });
    });

    console.log('Got all frames:', tabId, frames);
    for (const frame of (frames || [])) {
      console.log('- Frame:', tabId, frame.url, frame);
    }

    try {
      results = await chrome.scripting.executeScript({
        target: { tabId },
        injectImmediately: true,
        args,
        func: injectFunction,
      });
    } catch (e) {
      console.error(`Got error during injection for ${url} ${tabId}: ${e}, results: ${results}`);
    }

    console.log('Results from navigation are:', tabId, results);
    if (results && results[0].result) break;

    console.error(`Got no results, sleep and try again (${i}/${maxTabAttempts}): ${url} ${tabId}`);

    await sleep(1000);
  }

  removeListener(handleStop);

  if (shouldClose) closeTabIfExists(tabId);

  if (!results) {
    console.error(`Giving up for ${url}, return error`);
    return { error: `Could not get tab data for ${url}` };
  }

  console.log('Getting result from', results);

  const result = results[0].result;
  console.log('Success', result);

  if (result.redir) {
    console.log('Handle redir', result.redir);
    return getPageData(result.redir, options);
  } else {
    return result;
  }
}

export const getActiveTab = async () => {
  return new Promise((ok) => {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs) => ok(tabs[0] ? tabs[0] : null));
  });
}

export const getTabWithUrl = async (url) => {
  return new Promise((ok) => {
    chrome.tabs.query(
      { url },
      (tabs) => ok(tabs[0] ? tabs[0] : null));
  });
}

export const reportSleep = async (url, msec) => {
  const hostname = (new URL(url)).hostname;
  if (!loadSleepTimes[hostname]) {
    loadSleepTimes[hostname] = {
      times: [],
    };
  }
  const t = loadSleepTimes[hostname].times;
  t.unshift(msec);
  loadSleepTimes[hostname].times = t.slice(0, 10);
  console.log('nav loadSleepTimes', hostname, loadSleepTimes[hostname].times);

  setKey('loadSleepTimes', loadSleepTimes);
}

export const suggestSleep = (url) => {
  if (!url) {
    // No URL: No suggested sleep time, and don't check for loads
    return [null, false];
  }

  const hostname = (new URL(url)).hostname;
  const data = loadSleepTimes[hostname];
  if (!data || data.times.length < 2) {
    return [null, true];
  }
  const suggested = Math.min(
    15*1000,  // Hard cap 15 seconds sleep
    Math.max(...(data.times)) * 1.1);

  // Check it less as time goes on, min 5% of the time
  const shouldCheckLoad = Math.random() < Math.max(
    0.05,
    0.80 - data.times.length / 20);

  return [suggested, shouldCheckLoad];
}

const injectFunction = async (sleepTime, shouldCheckLoad) => {
  console.log('injected', sleepTime, shouldCheckLoad);

  const defaultSleep = shouldCheckLoad ? 500 : (sleepTime || 1500);
  const dynamicSleep = 2000;

  // Max 15 seconds per page
  // TODO: test/ fix this
  const x = await Promise.any([
    new Promise((ok) =>
      setTimeout(() => {
        console.error(`Injection timeout ${window.location.href}`);
        ok({ error: 'timeout' });
      }, 20*1000)),

    new Promise(async (ok) => {
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const start = (new Date()).getTime();

      // Sleep a for dynamic content
      await sleep(defaultSleep);

      // via https://chatgpt.com/share/ef8bcaec-6fb1-478b-a074-1ae22c908ae2
      const getText = (node) => {
        let t = '';
        if (node.nodeType === Node.TEXT_NODE) {
          t += ' ' + node.textContent.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (!['script', 'style'].includes(node.nodeName.toLocaleLowerCase())) {
            if (node.shadowRoot) {
              t += ' ' + getText(node.shadowRoot);
            }
            node.childNodes.forEach(child => {
              t += ' ' + getText(child);
            });
          }
        }
        return t;
      }

      // via https://chatgpt.com/share/e9a142ab-775d-4f1d-8a84-69f829ffc45c
      const getHtml = (node) => {
        let clone = node.cloneNode(true);
        for (const tagName of ['style', 'path', 'code']) {
          clone
            .querySelectorAll(tagName)
            .forEach(el => el.remove());
        }

        // Remove hidden elements, LinkedIn puts in a bunch of these
        const els = clone.querySelectorAll('*');
        els.forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.display == 'none') el.remove();
        });
        return clone.outerHTML;
      }

      const url = window.location.href;
      let text = getText(document.body) || '';
      let html = getHtml(document.body) || '';

      const maxDynamicWaits = 3;
      let i;
      for (i = 0; shouldCheckLoad & i < maxDynamicWaits; i++) {
        // Check if its loaded
        console.log('== check if loaded ==', { text, html });
        const resp = await new Promise((ok) => {
          chrome.runtime.sendMessage(
            {
              action: 'checkLoading',
              text,
              html,
            },
            (resp) => {
              console.log('checkloading said:', resp);
              ok(resp);
            });
        });

        if (resp.answer?.status == 'done' || resp.status == 'error') {
          console.log('== checkLoading done! break ==');

          if (i > 0) {
            chrome.runtime.sendMessage({
              action: 'setStatus',
              message: 'Loaded dynamic content on ' + url,
            });
          }
          break;
        }

        // Page maybe not loaded... let's wait and try again
        chrome.runtime.sendMessage({
          action: 'setStatus',
          message: 'Waiting for dynamic content on ' + url,
        });
        console.log('== checkLoading waiting ==');
        await sleep(dynamicSleep);

        if (i + 1 == maxDynamicWaits) {
          chrome.runtime.sendMessage({
            action: 'setStatus',
            message: 'Give up waiting for dynamic content on ' + url,
          });
        }

        text = getText(document.body) || '';
        html = getHtml(document.body) || '';
      }

      const took = (new Date()).getTime() - start;

      if (shouldCheckLoad) {
        chrome.runtime.sendMessage({
          action: 'reportSleep',
          url,
          msec: took,
        });
      }

      console.log('check for redir', text);

      // Special case Archive.org redirects
      if (url.indexOf('https://web.archive.org') == 0 &&
          text.match(/Got an HTTP 30[0-9] response at crawl time/)) {

        console.log('archive org redir, find url');
        const m = html.match(/<p class="impatient"><a href="([^"]+)"/);
        if (m) {
          let redir = m[1];
          if (redir[0] == '/') {
            redir = 'https://web.archive.org' + redir;
          }
          console.log('archive org redir', redir);
          return { redir };
        }
      }

      // // Sleep extra on LinkedIn
      // if (url.indexOf('https://www.linkedin.com') != -1) {
      //   await sleep(3000);
      // }

      const tags = document.querySelectorAll('a');
      let id = 0;

      const links = Array.from(tags).map(a => ({
        id: id++,
        html: a.outerHTML.substr(0, 1000),
        text: a.innerText.substr(0, 200),
        url: a.href,
      }));

      ok({ url, text, html, links });
    })
  ]);

  console.log('inject response gave:', x);

  return x;
}
