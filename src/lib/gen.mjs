import { exec, query, stream } from './ai.mjs';
import { sleep } from './util.mjs';
import { setStatus, nextId } from './store.mjs';
import { genJobTemplate } from './templates.mjs';
import { sendNextIdMessage } from './job.mjs';

export const genJob = async (scrapePrompt, url, page) => {
  const count = 5000;
  const answer = await exec(
    'genJob',
    {
      url,
      prompt: scrapePrompt,
      text: (page ? page.text : '').slice(300000),
      html: page ? page.html.slice(0, count) : '',
      count,
    });

  const job = {
    id: await sendNextIdMessage(),
    name: (new URL(url)).hostname + ' - ' + (answer?.itemSummary || ''),
    urls: {
      action: 'gather',
      url: url,
      list: [],
      question: (answer?.gatherPrompt || 'Error, try again'),
    },
    scrape: {
      action: 'scrape',
      questions: (answer?.detailFields || ['Error: try again']),
    },
  };

  return job;
}

export const genBlankJob = async () => {
  return {
    id: await sendNextIdMessage(),
    name: 'Untitled Scrape',
    urls: {
      action: 'gather',
      url: '',
      list: [],
      question: '',
    },
    scrape: {
      action: 'scrape',
      questions: [],
    },
  };
}

export const genJobFromUrls = async (urls) => {
  const unique = [];
  const seen = {};
  for (const url of urls) {
    if (seen[url]) continue;
    unique.push(url);
    seen[url] = true;
  }
  const urlString = unique.join('\n') + '\n';
  return {
    id: await sendNextIdMessage(),
    name: 'Untitled Scrape',
    urls: {
      action: 'gather',
      url: urlString,
      manualUrls: urlString,
      list: [],
      question: '',
    },
    scrape: {
      action: 'scrape',
      questions: [],
    },
  };
}
