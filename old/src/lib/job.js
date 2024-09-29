export const runJob = async (job) => {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = current.url == job.urls?.url ? current.id : null;
  return chrome.runtime.sendMessage({ action: 'runJob', job, tabId });
}

export const runGather = async (job) => {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = current.url == job.urls?.url ? current.id : null;
  return chrome.runtime.sendMessage({ action: 'runGather', job, tabId });
};

export const runScrape = async (job, urls) => {
  return chrome.runtime.sendMessage({ action: 'runScrape', job, urls });
}

export const sendStopMessage = async () => {
  return chrome.runtime.sendMessage({ action: 'stop' });
}

// TODO: use this pattern for most/all future functiosn in this file
// TODO: rename this file to something reflecting this new pattern
export const sendNextIdMessage = async () => {
  return new Promise(ok => chrome.runtime.sendMessage({ action: 'nextId' }, ok));
}
