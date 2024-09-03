import JSON5 from 'json5'

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const formatNumber = (number) => {
  return ('' + number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const splitUrls = (str) => {
  return str
    .split('\n')
    .map(x => x.trim());
}

export const parseJsonl = (str) => {
  const lines = str.split('\n');
  console.log('parseJsonl', lines);
  const result = [];
  for (const line of lines) {
    try {
      result.push(JSON5.parse(line));
    } catch(e) {
      // console.warn('skipping invalid jsonl:', line);
    }
  }
  return result;
}
