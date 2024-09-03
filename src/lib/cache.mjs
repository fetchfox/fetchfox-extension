/* eslint-disable */

import { sha256 } from 'js-sha256';

const cacheDir = '/tmp/ff_v3_cache';

let fs;
let path;
let crypto;

async function loadImports() {
  try {
    // suppress warnings using: https://stackoverflow.com/questions/42908116/webpack-critical-dependency-the-request-of-a-dependency-is-an-expression
    if (!fs) {
      const n = 'fs';
      fs = await import(`${n}`);
    }
    if (!path) {
      const n = 'path';
      path = await import(`${n}`);
    }
    if (!crypto) {
      const n = 'crypto';
      crypto = await import(`${n}`);
    }

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
  } catch(e) {
    console.log('caught:', e);
  }
}

async function getCacheFilePath(prompt) {
  await loadImports();
  if (!crypto || !path) return;

  const hash = sha256(prompt);
  // crypto.createHash('md5').update(prompt).digest('hex');
  return path.join(cacheDir, hash + '.json');
}

function chromeCacheKey(prompt) {
  return 'promptCache.' + sha256(prompt);
}

function hasChrome() {
  try {
    chrome;
    return true;
  } catch(e) {
    return false;
  }
}

async function readCacheChrome(prompt) {
  const key = chromeCacheKey(prompt);
  const pc = (await chrome.storage.local.get('promptCache')) || {};
  // const r = await chrome.storage.local.get(key);
  if (pc[key]) return r[key];
  else return null;
}

async function writeCacheChrome(prompt, result) {
  const key = chromeCacheKey(prompt);
  const st = await chrome.storage.local.get();
  let promptCache;
  if (!st.promptCache) promptCache = {};
  promptCache[key] = result;
  // return chrome.storage.local.set({ promptCache });
}

export async function readCache(prompt) {
  if (hasChrome()) {
    const r = await readCacheChrome(prompt);
    console.log('Chrome cache gave result:', r);
    return r;
  }

  await loadImports();
  if (!fs) return;

  const cacheFilePath = await getCacheFilePath(prompt);
  if (fs.existsSync(cacheFilePath)) {
    const data = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

export async function writeCache(prompt, result) {
  if (hasChrome()) {
    return writeCacheChrome(prompt, result);
  }

  await loadImports();
  if (!fs) return;

  const cacheFilePath = await getCacheFilePath(prompt);
  fs.writeFileSync(cacheFilePath, JSON.stringify(result), 'utf8');
}
