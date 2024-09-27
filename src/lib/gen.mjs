import { exec, query, stream } from './ai.mjs';
import { sleep } from './util.mjs';
import { setStatus, nextId } from './store.mjs';
import { genJobTemplate } from './templates.mjs';
import { sendNextIdMessage } from './job.mjs';
import { getAvailableModels } from './ai.mjs';
import { findPagination } from './gather.mjs';

const domainRules = {
  'www.google.com': [
    `Determine if the user is interestedin OFFSITE links, eg. search results. If yes, the "itemDescription" and "gatherPrompt" should IGNORE links containing www.google.com in them.`,
  ]
};

export const genJob = async (scrapePrompt, url, page) => {
  const count = 5000;

  const text = page?.text || '';
  const html = page?.html || '';

  const hostname = (new URL(url)).hostname;
  console.log('hostname for job:', hostname);
  let extraRules = domainRules[hostname];
  if (extraRules) {
    extraRules = `Follow these IMPORTANT instructions SPECIFIC to ${hostname}:\n${extraRules}`;
  }

  const available = await getAvailableModels();
  console.log('available models for gen job:', available);
  const modelOverride = available.includes('gpt-4o') ? 'gpt-4o' : null;
  console.log('using modelOverride for gen job:', modelOverride);

  const answer = await exec(
    'genJob2',
    {
      url,
      prompt: scrapePrompt || '(not given, guess based on the page content)',
      text: text.substr(0, 30000),
      html: html.substr(0, 6000),
      count,
      extraRules,
    },
    null,
    modelOverride);

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
