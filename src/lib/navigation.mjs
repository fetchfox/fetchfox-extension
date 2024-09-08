import { setStatus } from './store.mjs';
import { addListener, removeListener } from './controller.mjs';
import { sleep } from './util.mjs';


const loadSleepTimes = {};

export const getPageData = async (url, active, onCreate) => {
  const tabWithUrl = await getTabWithUrl(url);
  if (tabWithUrl) {
    return getTabData(tabWithUrl.id, false);
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
        console.log('Got error:', details);
        if (details.frameType == 'outermost_frame') {
          error = details;
          ok('error');
        }
      }
    });

    errorHandleStop = () => {
      chrome.webNavigation.onErrorOccurred.removeListener(listener);
      if (!active) { try { chrome.tabs.remove(tab.id) } catch(e) {} }
    }
    addListener(errorHandleStop);
  });

  const pageLoad = new Promise((ok, bad) => {
    const listener = chrome.tabs.onUpdated.addListener((tabId, info) => {
      if (tabId == tab.id && info.status == 'complete') {
        console.log('mmm tab STATUS UPDATE', info);
        chrome.tabs.onUpdated.removeListener(listener);
        ok('load');
      }
    });

    handleStop = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      if (!active) { try { chrome.tabs.remove(tab.id) } catch(e) {} }
    }
    addListener(handleStop);
  });

  const outcome = await Promise.any([pageLoad, errorLoad]);

  setStatus('Loaded page ' + url);

  removeListener(handleStop);

  if (error) {
    if (!active) { try { chrome.tabs.remove(tab.id) } catch(e) {} }
    return { error };
  }

  return getTabData(tab.id, true);
}

export const getTabData = async (tabId, shouldClose) => {
  if (!tabId) {
    tabId = (await getActiveTab()).id;
  }

  const handleStop = () => {
    if (shouldClose) chrome.tabs.remove(tabId);
  }
  addListener(handleStop);

  let results;
  // Retry a few times, mainly for redirects
  for (let i = 0; i < 3; i++) {
    // get the html + text
    console.log('=> Inject:', tabId, i);

    try {
      const args = [...suggestSleep(await getTabUrl(tabId))];
      console.log('sleep args', args);
      results = await chrome.scripting.executeScript({
        target: { tabId },
        injectImmediately: true,
        args,
        func: async (sleepTime, shouldCheckLoad) => {
          console.log('injected', sleepTime, shouldCheckLoad);

          const defaultSleep = shouldCheckLoad ? 500 : (sleepTime || 1500);
          const dynamicSleep = 2000;

          // Max 15 seconds per page
          // TODO: test/ fix this
          const x = await Promise.any([
            new Promise((ok) =>
              setTimeout(() => {
                console.log('===> TIMEOUT', window.location.href);
                ok({ error: 'timeout' });
              }, 18*1000)),

            new Promise(async (ok) => {
              const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

              const start = (new Date()).getTime();
              // Sleep a little for dynamic content
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
                for (const tagName of ['style', 'path']) {
                  clone
                    .querySelectorAll(tagName)
                    .forEach(el => el.remove());
                }
                return clone.outerHTML;
              }

              const url = window.location.href;
              let text = getText(document.body) || '';
              let html = getHtml(document.body) || '';

              const maxDynamicWaits = 3;
              let i;
              for (i = 0; shouldCheckLoad & i < maxDynamicWaits; i++) {
                // Check if its loaded
                console.log('== check if loaded ==');
                // const status = 'xyz';
                const status = await new Promise((ok) => {
                  chrome.runtime.sendMessage(
                    {
                      action: 'checkLoading',
                      text,
                      html,
                    },
                    (resp) => {
                      console.log('checkloading said:', resp);
                      ok(resp.answer?.status);
                    });
                });

                if (status == 'done') {
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

              // Sleep extra on LinkedIn
              if (url.indexOf('https://www.linkedin.com') != -1) {
                await sleep(3000);
              }

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
        },
      });
    } catch (e) {
      console.error('Got error during injection:', e);
    }

    console.log('Results from navigation are:', results);
    if (results && results[0].result) break;
    console.log('Got no results, sleep and try again');

    await sleep(3000);
  }

  removeListener(handleStop);

  if (shouldClose) {
    try { await chrome.tabs.remove(tabId) } catch(e) {}
  }

  if (!results) return { error: 'no result' };

  console.log('Getting result from', results);

  const result = results[0].result;
  console.log('Success', result);

  if (result.redir) {
    console.log('Handle redir', result.redir);
    return getPageData(result.redir);
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
}

export const suggestSleep = (url) => {
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

const getTabUrl = async (tabId) => {
  return new Promise((ok) => {
    chrome.tabs.get(tabId, (tab) => ok(tab.url));
  });
}
