import { exec, query, stream } from './ai.mjs';
import { sleep } from './util.mjs';
import { setStatus, nextId } from './store.mjs';
import { genJobTemplate } from './templates.mjs';
import { sendNextIdMessage } from './job.mjs';

export const genJob = async (scrapePrompt, url, page) => {
  const count = 5000;

  const text = page?.text || '';
  const html = page?.html || '';

  // console.log('page', page);
  // return;

  const answer = await exec(
    'genJob2',
    {
      url,
      prompt: scrapePrompt || '(not given, guess based on the page content)',
      text: text.substr(0, 30000),
      html: html.substr(0, 6000),
      count,
    },
    null,
    'gpt-4o');

  console.log('GEN JOB 2 GAVE', await answer);

  if (!answer) {
    throw 'No answer for generate job';
  }

  const job = {
    id: await sendNextIdMessage(),
    name: (new URL(url)).hostname + ' - ' + (answer?.itemDescription || ''),
    urls: {
      manualUrls: url,
      url: url,
    },
    scrape: {
      action: 'scrape',
      questions: (answer?.detailFields || ['Error: try again']),
    },
  };

  if (answer?.scrapeType == 'singlePage') {
    job.urls.action = 'current';
    job.urls.currentUrl = url;
    job.urls.question = answer.itemDescription;
    job.scrape.perPage = 'multiple';
    job.scrape.concurrency = -1;
  } else if (answer?.scrapeType == 'multiPage') {
    job.urls.action = 'gather',
    job.urls.question = answer.itemDescription + ': ' + answer.gatherPrompt;
    job.scrape.perPage = 'single';
  }

  // const job = {
  //   id: await sendNextIdMessage(),
  //   name: (new URL(url)).hostname + ' - ' + (answer?.itemSummary || ''),
  //   urls: {
  //     action: 'gather',
  //     url: url,
  //     list: [],
  //     question: (answer?.gatherPrompt || 'Error, try again'),
  //   },
  //   scrape: {
  //     action: 'scrape',
  //     questions: (answer?.detailFields || ['Error: try again']),
  //   },
  // };

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
