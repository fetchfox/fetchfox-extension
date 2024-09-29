import { apiHost } from './constants';
import { getActiveJob } from './store';

export const sendReport = async (logs) => {
  const maxBytes = 900000;
  const l = logs.length;
  if (l > maxBytes) {
    logs = logs.substr(l - maxBytes);
  }

  const job = Object.assign({}, (await getActiveJob()));
  if (job.results?.targets) {
    // Don't need too many of these
    job.results.targets = job.results.targets.slice(0, 50);
  }
  const url = apiHost + '/api/report';
  const report = {
    manifest: chrome.runtime.getManifest(),
    job,
    logs,
  }
  console.log('sending report:', logs.substr(0, 100), report);
  let body = JSON.stringify({ report });

  // Stay under Vercel cap
  // https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE
  if (body.length > 4000000) {
    body = body.substr(0, 4000000);
  }

  const resp = await fetch(url, { method: 'POST', body });
  return resp.json();
}
