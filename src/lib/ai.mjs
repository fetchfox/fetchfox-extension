import jsonic from 'jsonic';
import JSON5 from 'json5'
import { createClient } from 'openai-tokens';
import OpenAI from 'openai';
import { apiHost } from './constants.mjs';
import { setKey, getKey, setStatus } from './store.mjs';
import { readCache, writeCache } from './cache.mjs';
import { setGlobalError } from './errors.mjs';
import { getTemplate } from './templates.mjs';
import { sleep, parseJsonl } from './util.mjs';

const queryLogCutoff = 1;  // 1 minute
let queryLog = [];
let observedRateLimit = 1000000;  // tpm, a guess that adjusts
let tpmTimeoutId;

export async function estimateTokens(prompt) {
  // TODO: more accurate token estimation
  return prompt.length / 4;
}

export async function exec(name, args, cb) {
  const plan = await getKey('openAiPlan');
  let answer;

  let askAI;

  if (plan == 'free') {
    console.log('AI using Free');

    // Run via mirror API
    askAI = async (name, args) => {
      const url = apiHost + '/api/mirror';
      const body = JSON.stringify({ template: name, ...args });
      console.log('making mirror request', url, name);
      const resp = await fetch(url, { method: 'POST', body });
      const data = await resp.json();
      console.log('got data response', data);
      if (data.error) {
        throw data.error;
      }
      return data.answer;
    }

  } else {
    console.log('AI using OpenAI key');

    // Run via user's API key
    askAI = async (name, args) => {
      const prompt = render(name, args);
      console.log('sending prompt to openai:', prompt);
      const resp = await stream(
        prompt,
        (text) => cb && cb(parseAnswer(text)));
      return resp[0];
    }
  }

  let retries = 3;
  while (true) {
    const rate = await checkRateLimit(render(name, args), plan);

    setKey('tpm', rate);
    if (tpmTimeoutId) { clearTimeout(tpmTimeoutId); tpmTimeoutId = null; }
    tpmTimeoutId = setTimeout(() => setKey('tpm', null), 15000);
    console.log('check rate limit gave', rate, 'limit:', observedRateLimit);

    let hitRateLimit = false;
    let resp;
    try {
      resp = await askAI(name, args);
      console.log('AI resp:', resp);
    } catch(e) {
      console.error('AI error:' + e);
      console.log('AI error retries left:', retries);

      // queryLog.push({
      //   count: 0,
      //   timestamp: Math.floor((new Date()).getTime() / 1000),
      //   error: true,
      // });
      // const errorCount = queryLog.filter(q => q.error).length;
      // console.log('errorCount', errorCount, plan);

      if (e.code == 'rate_limit_exceeded'
          && retries > 0) {

        observedRateLimit *= 0.9;
        console.log('Query rate limit hit, set new observedRateLimit:', observedRateLimit);
        hitRateLimit = true;
        retries--;
        await sleep(3000);

      } else if (e.code == 'rate_limit_exceeded'
                 && plan == 'free'
                 && retries <= 0) {

        setGlobalError(
          'High load! ' +
          'Please try again later, or enter your OpenAI API key in settings.');
        return;

      } else {
        setGlobalError('' + e);
        return;
      }
    }

    if (hitRateLimit) {
      console.log('check rate limit RETRY');
      setStatus('AI rate limit hit, slowing down...');
      retries--;
      continue;
    } else {
      answer = resp;
      // slowly grow rate limit until we hit it again
      observedRateLimit *= 1.005;
      break;
    }
  }

  console.log('ooo parsing:', answer);
  const result = parseAnswer(answer);
  console.log('ooo Returning clean AI resp', result);

  return result;
}

export async function stream(prompt, cb) {
  // throw 'test error';

  // Check for cached value
  const cachedResult = await readCache(prompt);
  if (cachedResult != undefined) {
    cb && cb({ delta: cachedResult, result: cachedResult });
    return [cachedResult, true];
  }

  const openai = new OpenAI({
    apiKey: await getKey('openAiKey'),
    dangerouslyAllowBrowser: true,
  });
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  console.log('AI gave stream:', stream);

  let result = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta.content;
    if (delta) result += delta;
    cb && cb(result);
  }

  console.log('AI gave result:', result);
  return [result, false];
}

const checkRateLimit = async (prompt, plan) => {
  // Rate limit check
  const count = await estimateTokens(prompt);
  let timestamp;
  let total;
  while (true) {
    timestamp = Math.floor((new Date()).getTime() / 1000);
    queryLog = queryLog.filter(q => q.timestamp >= timestamp - (queryLogCutoff * 60));
    total = queryLog.reduce((acc, q) => acc + q.count, 0);

    // If below rate limit, continue with query
    if ((total + count) / queryLogCutoff < observedRateLimit) break;

    setStatus('Waiting for AI rate limit...');
    console.log('check rate limit WAITING');

    await sleep(3000);
  }

  queryLog.push({ count, timestamp });
  const rate = Math.round((total + count) / queryLogCutoff);

  console.log('Query rate count:', rate, 'tokens per', queryLogCutoff, 'minutes');

  return rate;
}

const render = (name, args) => {
  const template = getTemplate(name);
  let prompt = template;
  for (const key of Object.keys(args)) {
    const val = (args[key] || '');
    prompt = prompt.replaceAll('{{' + key + '}}', val);
  }
  return prompt;
}

const parseAnswer = (text) => {
  if (!text) return;
  const clean = text
        .replace(/```jsonl?/, '')
        .replace('```', '')
        .replaceAll(/^`+|`+$/g, '');

  // Try to parse it as JSON
  try {
    return JSON5.parse(clean);
  } catch(e) {
    // It was not JSON
  }

  // Try to parse it as JSONL
  let data;
  try {
    data = parseJsonl(clean);
  } catch (e) {
    console.warn('Unable to parse partial response:', clean, e);
  }
  if (data && data.length > 0) {
    return data;
  }

  // We don't know what it is, return null
  return null;
}
