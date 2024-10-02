import JSON5 from "json5";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const formatNumber = (number, abbrev) => {
  if (abbrev && number >= 1000000) {
    return formatNumber(Math.round(number / 100000) / 10, false) + "M";
  } else if (abbrev && number >= 1000) {
    return formatNumber(Math.round(number / 1000), false) + "k";
  } else {
    return ("" + number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

export const splitUrls = (str) => {
  return str
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => !!x && x !== "");
};

export const parseJsonl = (str) => {
  const lines = str.split("\n");
  // console.log('parseJsonl', lines);
  const result = [];
  for (const line of lines) {
    try {
      result.push(JSON5.parse(line));
    } catch (e) {
      // console.warn('skipping invalid jsonl:', line);
    }
  }
  return result;
};

export const getJobColumn = (job, header) => {
  const col = [];
  for (const target of job?.results?.targets || []) {
    if (header === "URL") {
      col.push(target.url);
    } else {
      for (const a of target.answer || []) {
        col.push(a[header] || "");
      }
    }
  }

  return col;
};

export const getJobUrl = (job) => {
  if (job.urls?.action === "gather") {
    return job.urls?.url;
  } else if (job.urls?.action === "current") {
    return job.urls?.currentUrl;
  } else if (job.urls?.action === "manual") {
    return job.urls?.manualUrls;
  }
  return "";
};
