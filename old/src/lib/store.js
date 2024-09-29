import { isActive } from './controller';
import { storage } from './storage';

let updateQueue = Promise.resolve();

function enqueue(fn) {
  updateQueue = updateQueue.then(fn);
  return updateQueue;
}

export async function getKey(key) {
  return await storage.get(key);
}

export function updateKey(key, fn) {
  return enqueue(async () => {
    const value = await getKey(key);
    const updated = await fn(value);
    await storage.set(key, updated);
  });
}

export function setKey(key, value) {
  return enqueue(async () => {
    await storage.set(key, value);
  });
}

function getJobKey(jobId) {
  return 'job_' + jobId;
}

const updateJob = async (jobId, fn) => {
  return updateKey(getJobKey(jobId), fn);
};

export async function nextId() {
  let ret = 0;

  await updateKey('nextId', (nextId) => {
    ret = nextId ?? 0;
    return ret + 1;
  });

  return ret;
}

export const getJob = (jobId) => getKey(getJobKey(jobId));

export const saveJob = async (job) => {
  if (!job.id) {
    throw 'no job id: ' + JSON.stringify(job);
  }
  return setKey(getJobKey(job.id), job);
};

export const setJobField = async (jobId, field, val) => {
  return updateJob(jobId, (job) => {
    console.log('Set job field:', jobId, field, val);
    job[field] = val;
    return job;
  });
};

export const getActiveJob = async () => {
  const activeId = await getKey('activeId');
  if (!activeId) return Promise.resolve(null);

  const job = await getJob(activeId);
  if (!job) return Promise.resolve(null);
  if (!job.id) {
    job.id = activeId;
    return saveJob(job).then(() => Promise.resolve(job));
  } else {
    return new Promise((ok) => ok(job));
  }
};

export const setActiveJob = async (activeId) => {
  st.activeId = activeId;

  return await chrome.storage.local.set({ activeId });
};

export async function setStatus(message, roundId, delta) {
  console.log('setStatus got message:', message);

  await setKey('status', { message });
  if (roundId && delta) {
    if (await isActive(roundId)) {
      updateKey('inFlight', (old) => (old ?? 0) + delta);
    }
  }
}

export const setPercent = async (percent, done, total) => {
  await setKey('percent', Math.max(0.01, Math.min(percent, 0.99)));
  await setKey('completion', { done, total });
};

export const setScrapeAnswer = async (jobId, url, answer) => {
  console.log('setScrapeAnswer', jobId, url, answer);

  let answers = {};
  answers[url] = answer;

  return setJobResults(jobId, { answers });
};

export const setScrapeStatus = async (jobId, roundId, urls, val) => {
  console.log('setScrapeStatus', jobId, roundId, urls, val);

  return updateJob(jobId, (job) => {
    if (!job.results) job.results = { targets: [] };
    for (const target of job.results.targets) {
      if (urls.includes(target.url)) {
        target.status = val;
        target.roundId = roundId;
        target.loading = target.status == 'scraping';
      }
    }

    return job;
  });
};

export const clearJobResults = async (jobId) => {
  console.log('clearJobResults locked update');
  return updateJob(jobId, (job) => {
    job.results = { targets: [], answers: {} };
    return job;
  });
};

export const addUrlsToJob = async (jobId, urls, clearMissing) => {
  return setJobResults(
    jobId,
    {
      targets: urls.map((x) => {
        return { url: x, status: 'new' };
      }),
    },
    clearMissing
  );
};

export const removeUrlsFromJob = async (jobId, rmUrls) => {
  console.log('removeUrlsFromJob locked update');
  return updateJob(jobId, (job) => {
    if (!job.results) job.results = {};

    console.log('running removeUrlsFromJob', rmUrls);

    const updated = [];
    const existing = job.results?.targets || [];
    for (const target of existing) {
      if (!rmUrls.includes(target.url)) {
        updated.push(target);
      }
    }

    job.results.targets = updated;
    return job;
  });
};

export const setJobResults = async (
  jobId,
  { targets, answers },
  clearMissing
) => {
  return updateJob(jobId, (job) => {
    console.log('setting job results', jobId, job);

    if (!job.results) job.results = {};

    if (targets && !job.urls.shouldClear && job.results.targets) {
      const have = new Set(job.results.targets.map((it) => it.url));

      targets = [
        ...JSON.parse(JSON.stringify(job.results.targets)),
        ...targets.filter((t) => !have.has(t.url)),
      ];

      job.urls.shouldClear = false;
    }

    if (targets) job.results.targets = targets;
    if (answers) {
      const guessType = (val) => {
        if (!isNaN(parseFloat(val))) return 'number';
        if (('' + val).match(/^https?:\/\//)) return 'url';
        return 'string';
      };

      const typeCounts = {};
      const counts = {};
      for (const url of Object.keys(answers)) {
        for (const answer of answers[url]) {
          for (const key of Object.keys(answer)) {
            if (!counts[key]) counts[key] = 0;
            if (!typeCounts[key]) {
              typeCounts[key] = {
                string: 0,
                url: 0,
                number: 0,
              };
            }
            counts[key]++;
            typeCounts[key][guessType(answer[key])]++;
          }
        }
      }

      job.results.answerHeaders = Object.keys(counts);

      const types = {};
      for (const h of job.results.answerHeaders) {
        const threshold = 0.5;
        if (typeCounts[h].url / counts[h] > threshold) types[h] = 'url';
        else if (typeCounts[h].number / counts[h] > threshold)
          types[h] = 'number';
        else types[h] = 'string';
      }
      job.results.types = types;

      job.results.answers = answers;
    }

    const r = job.results;
    if (r.targets && r.answers) {
      for (const target of r.targets || []) {
        if (r.answers[target.url]) {
          target.answer = r.answers[target.url];

          // for (const key of Object.keys(target.answer)) {
          //   const val = target.answer[key];
          //   if (Array.isArray(val)) {
          //     target.answer[key] = val.join(', ');
          //   } else if (typeof val != 'string') {
          //     target.answer[key] = JSON.stringify(val);
          //   }
          // }
        } else if (clearMissing) {
          target.answer = null;
        }
      }
    }

    return job;
  });
};

export const stopActiveJob = async () => {
  const activeJob = await getActiveJob();
  if (!activeJob) return;

  return updateJob(activeJob.id, (job) => {
    if (!job.results) job.results = {};

    for (const target of job.results?.targets || []) {
      if (target.loading) target.status = 'stopped';
      target.loading = false;
    }

    return job;
  });
};
