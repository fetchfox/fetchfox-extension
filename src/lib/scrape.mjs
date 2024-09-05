import { exec } from './ai.mjs';
import { sleep } from './util.mjs';
import { setStatus } from './store.mjs';
import { getRoundId, isActive } from './controller.mjs';
import { scrapeTemplate } from './templates.mjs';

export const scrapePage = async (
  page,
  questions,
  itemDescription,
  extraRules,
  cb) =>
{

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


  const clip = 180000;
  const len = page.text.length + page.html.length;

  console.log('clip should we clip?', len, clip);
  console.log('clip len text', page.text.length);
  console.log('clip len html', page.html.length);

  const scrapeInner = async (offset, existing, cb) => {
    const textChunkSize =  50000;
    const htmlChunkSize = 120000;

    const text = page.text.slice(
      offset * textChunkSize,
      (offset + 1) * textChunkSize);

    const html = page.html.slice(
      offset * htmlChunkSize,
      (offset + 1) * htmlChunkSize);

    const context = {
      url: page.url,
      questions: JSON.stringify(translateToHeaders(questions), null, 2),
      text,
      html,
      extraRules,
      count: '',
    };

    if (itemDescription) {
      context.itemDescription = (
        'You are looking for this type of item(s):\n\n' +
        itemDescription);
    }

    console.log('manual scrape sending context', context);

    let prevLength = 1;  // set it to 1 to ignore itemCount row
    const a = await exec(
      'scrape',
      context,
      (partial) => {
        if (cb && partial && partial.length > prevLength) {
          if (!await isActive(roundId)) return answer;
          cb(existing.concat(partial.slice(1)));
          prevLength = partial.length;
        }
      });

    const ensureArray = (x) => {
      if (!x) return [];
      if (!Array.isArray(x)) return [x];
      return x;
    }

    console.log('Scrape answer:', a);
    return {
      answer: ensureArray(a)
        .filter(i => i.itemCount == undefined ||
                Object.keys(i).length > 1),
      more: (page.text.length > (offset + 1) * textChunkSize ||
             page.html.length > (offset + 1) * htmlChunkSize),
    };
  }

  let answer = [];
  let offset = 0;

  // max 3 iterations
  for (let i = 0; i < 3; i++) {
    console.log('clip iteration', offset);
    const result = await scrapeInner(offset++, answer, cb);

    console.log('clip scrape inner gave:', result.answer);
    console.log('clip is there more?', result.more);

    if (!await isActive(roundId)) return answer;
    answer = answer.concat(result.answer);

    console.log('clip combined answer:', answer);

    if (!result.more) break;
  }

  setStatus('AI: ' + JSON.stringify(answer));
  return answer;
}
