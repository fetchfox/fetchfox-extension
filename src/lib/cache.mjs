import { sha256 } from 'js-sha256';
import { getKey, setKey } from './store.mjs';

const getTtl = (part) => {
  return 24 * 3600;
}

export const cacheKey = (part, keys) => {
  const keyStr = JSON.stringify(keys);
  return `${part}-${keyStr.replace(/^[A-Za-z0-9]+/g, '-').substr(0, 40)}-${sha256(part + keyStr).substr(0, 40)}`;
}

export const getCache = async (part, keys) => {
  const key = cacheKey(part, keys,);
  const cache = (await getKey('cache')) || {};
  const data = cache[key];
  if (!data) return;
  if (Date.now() > data.expiresAt || data.val == undefined) {
    delete cache[key];
    setKey('cache', cache);
    return;
  }

  console.log('cache hit', key, data);

  return data.val;
}

export const setCache = async (part, keys, val) => {
  const key = cacheKey(part, keys,);

  console.log('set cache', part, keys, key, val);

  const ttl = getTtl(part)
  const cache = (await getKey('cache')) || {};
  cache[key] = { val, expiresAt: Date.now() + ttl * 1000};

  // Expire items based on TTL
  for (const k of Object.keys(cache)) {
    const data = cache[k];
    if (Date.now() > data.expiresAt || data.val == undefined) {
      delete cache[k];
    }
  }

  return await setKey('cache', cache);
}
