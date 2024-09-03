import { stream, exec } from './ai.mjs';
import { sleep, shuffle } from './util.mjs';
import {
  getRoundId,
  isActive,
  addListener,
  removeListener,
} from './controller.mjs';
import { getActiveJob, setJobResults, setStatus } from './store.mjs';
import { gatherTemplate } from './templates.mjs';


export const cleanLinks = (l) => {
  const clean = [];
  const seen = {};    
  console.log('clean links:', l);
  for (let item of l) {
    if (!item.url) {
      console.warn('got invalid link:', item);
      continue;
    }

    // De-dupe anchors for now. May want to revisit this later.
    item.url = item.url.split('#')[0];
    clean.push(item);
  }
  return clean;
}

export const dedupeLinks = (l) => {
  const u = [];
  const seen = {};    
  for (let item of cleanLinks(l)) {
    if (seen[item.url]) continue;
    seen[item.url] = true;
    u.push(item);
  }
  return u;
}

const chunkList = (list, maxBytes) => {
  const chunks = [];
  let current = [];
  for (let item of list) {
    current.push(item);
    if (JSON.stringify(current, null, 2).length > maxBytes) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) {
    chunks.push(current);
  }
  return chunks;
};

export const parseLinks = async (page, question, cb) => {
  const roundId = await getRoundId();

  let links = page.links;
  for (let i = 0; i < links.length && i < 10; i++) {
    console.log('shuffle ' + i + ')o ' + links[i].url);
  }
  links = shuffle(page.links);
  console.log('shuffle parse links for:', links);
  for (let i = 0; i < links.length && i < 10; i++) {
    console.log('shuffle ' + i + ')s ' + links[i].url);
  }

  const limit = 6000;
  const slimmer = item => ({
    id: item.id,
    html: item.html.substr(0, 200),
    text: item.text,
    url: item.url,
  });

  const expander = item => {
    console.log('expand:', item, page.links);
    const m = page.links.filter(x => x.id == item.id);
    console.log('expand m:', m);
    return m.length > 0 ? m[0] : item;
  }

  const chunked = chunkList(links.map(slimmer), limit);

  let matches = [];

  for (let i = 0; i < chunked.length; i++) {
    if (!await isActive(roundId)) break;

    const chunk = chunked[i];

    console.log('gather from chunk:', chunk);

    const answer = (await exec(
      'gather',
      {
        question,
        list: JSON.stringify(chunk.map(slimmer), null, 2),
      })) || [];

    console.log('ai gather gave answer:', answer.map(expander));

    if (!await isActive(roundId)) return [];

    matches = dedupeLinks(matches.concat(answer.map(expander)));
    console.log('matching urls:', matches);

    console.log('gather cb', i, chunked.length, i / chunked.length);
    if (cb) cb(cleanLinks(matches), i / chunked.length);

    await setStatus(`Crawl stage completed ${i+1}/${chunked.length} chunks`);
  }

  return dedupeLinks(matches);
}
