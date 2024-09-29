import { apiHost } from './constants';

export const shareResults = async (job) => {
  console.log('share results', job);
  const url = apiHost + '/api/share';
  const body = JSON.stringify({ job });
  const resp = await fetch(url, { method: 'POST', body });
  return resp.json();
}
