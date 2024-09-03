import { setStatus } from './store.mjs';
import { addListener, removeListener } from './controller.mjs';
import { sleep } from './util.mjs';

export const getPageData = async (url, active, onCreate) => {
  let tab;

  const tabWithUrl = await getTabWithUrl(url);

  // const activeTab = await getActiveTab();
  // console.log('getPageData tabWithUrl', tabWithUrl);
  // console.log('getPageData activeTab', activeTab);
  // console.log('getPageData urls', activeTab.url == url, activeTab.url, url);

  if (tabWithUrl) {
    return getTabData(tabWithUrl.id, false);
  }

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

  console.log('?? error while loading page?', url, outcome, error);

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
      results = await chrome.scripting.executeScript({
        target: { tabId },
        injectImmediately: true,
        func: async () => {
          console.log('injected');

          // Max 15 seconds per page
          // TODO: test/ fix this
          const x = await Promise.any([
            new Promise((ok) =>
              setTimeout(() => {
                console.log('===> TIMEOUT', window.location.href);
                ok();
              }, 15*1000)),

            new Promise(async (ok) => {
              const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

              // Sleep a little for dynamic content
              await sleep(2000);

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
              const text = getText(document.body); //document.body.innerText;
              //const html = getHtml(document.documentElement); //document.documentElement.innerHTML;
              const html = document.documentElement.innerHTML;

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

  if (!results) return {};

  console.log('mmm getting result from', results);

  const result = results[0].result;
  console.log('mmm SUCCESS!', result);

  if (result.redir) {
    console.log('===> hhh handle redir', result.redir);
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
