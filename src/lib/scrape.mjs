import { exec } from './ai.mjs';
import { sleep } from './util.mjs';
import { setStatus } from './store.mjs';
import { getRoundId, isActive } from './controller.mjs';
import { scrapeTemplate } from './templates.mjs';

export const scrapePage = async (page, questions, extraRules, cb) => {
  const roundId = await getRoundId();
  if (!await isActive(roundId)) return;

  const translateToHeaders = (questions) => {
    const result = {};
    let i = 0;
    for (let q of questions) {
      if (q == '') continue;
      result[q] = '';
    }
    return result;
  };

  console.log('scrape page:', page);
  console.log('new prompt');

  const clip = 180000;
  const len = page.text.length + page.html.length;

  let answer = {};

  if (false && len > clip) {
    console.log('clip len text', page.text.length);
    console.log('clip len html', page.html.length);

    const keyMissing = (a, key) => !a[key] || a[key] == '(not found)';
    const countMissing = (a) => {
      return Object.keys(a)
          .filter(key => keyMissing(a, key))
          .length;
    };

    const maxIterations = 3;
    let iterations = 0;

    const context = {
      url: page.url,
      questions: JSON.stringify(translateToHeaders(questions), null, 2),
      text: '(not available)',
      html: '(not available)',
      extraRules,
      count: clip,
    };

    for (let field of ['text', 'html']) {
      const val = '' + page[field];

      for (let i = 0; i < maxIterations && i * clip < val.length; i++) {
        if (!await isActive(roundId)) return;

        const delta = {};
        delta[field] = val.slice(i * clip, (i+1) * clip);
        console.log('clip sending delta', delta);
        iterations++;
        const partial = await exec('scrape', Object.assign({}, context, delta));
        console.log('clip got partial', partial);

        if (!partial) {
        console.log('clip got null partial', partial);
          continue;
        }

        for (const key of Object.keys(partial)) {
          if (answer[key] &&
              answer[key] != '(not found)' &&
              answer[key] != partial[key]) {
            console.warn(
              'Batching scrape gave conflicting answers:',
              key, answer[key], partial[key]);
          }

          // if (!answer[key] || answer[key] == '(not found)') {
          if (keyMissing(answer, key)) {
            answer[key] = partial[key];
          }
        }
        console.log('clip so far:', i, field, answer);
        console.log('clip missing:', countMissing(answer), answer);

        if (!countMissing(answer)) break;
      }

      if (!countMissing(answer)) break;
    }
    console.log('clip done, got:', answer);
    console.log(
      'clip made this many queries:', iterations,
      'still missing:', countMissing(answer));
  } else {
    answer = await exec(
      'scrape',
      {
        url: page.url,
        questions: JSON.stringify(translateToHeaders(questions), null, 2),
        text: page.text.slice(0,  50000),
        html: page.html.slice(0, 120000),
        extraRules,
        count: '',
      },
      (partial) => {
        console.log('Scrape.mjs got partial:', partial);
        if (cb && partial && partial.length > 1) cb(partial.slice(1));
      });

    console.log('ooo scrape answer:', answer);
    answer = answer ? answer.slice(1) : [];
  }

  answer = answer || [];

  if (!await isActive(roundId)) return answer;

  setStatus('AI: ' + JSON.stringify(answer));
  return answer;
}
