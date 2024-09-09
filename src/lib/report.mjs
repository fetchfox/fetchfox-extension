import { apiHost } from './constants.mjs';
import { getActiveJob } from './store.mjs';

export const sendReport = async (logs) => {
  const maxBytes = 900000;
  const l = logs.length;
  if (l > maxBytes) {
    logs = logs.substr(l - maxBytes);
  }

  const url = apiHost + '/api/report';
  const report = {
    manifest: chrome.runtime.getManifest(),
    activeJob: (await getActiveJob()),
    logs,
  }
  console.log('sending report:', logs.substr(0, 100), report);
  const body = JSON.stringify({ report });
  const resp = await fetch(url, { method: 'POST', body });
  return resp.json();
}
