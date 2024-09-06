import { sleep } from './util.mjs';
import { getRoundId, isActive, advanceRound } from './controller.mjs';

let st;
let locked = false;

const lock = async () => {
  while (true) {
    if (!locked) {
      locked = true;
      break;
    }
    await sleep(10);
  }
};

const unlock = () => {
  if (!locked) throw 'cannot unlock if not locked';
  locked = false;
}

const lockedUpdate = async (fn) => {
  await initSt();
  await lock();

  try {
    const changes = await fn(await chrome.storage.local.get());
    const result = await chrome.storage.local.set(changes);
    return result;
  } finally {
    unlock();
  }
}

const lockedJobUpdate = async (jobId, fn) => {
  console.log('Start locked update', jobId);

  await initSt();
  await lock();
  console.log('Got LOCK', jobId);

  try {
    const job = await getJob(jobId);
    const updated = await fn(job);
    console.log('updated is:', updated);
    const result = await saveJob(job)
    return result;
  } finally {
    console.log('UNLOCK', jobId);
    unlock();
  }
}

// Update the in-memory st
// TODO: this entire thing should be refactored
chrome.storage.onChanged.addListener((changes) => {
  if (!st) return;
  for (const key of Object.keys(changes)) {
    st[key] = changes[key].newValue;
  }
});

const initSt = async () => {
  if (st) return;
  st = await chrome.storage.local.get();
  if (!st) { st = {} }
}

export const nextId = async () => {
  await initSt();

  if(!st.nextId) {
    st.nextId = 1;
  }
  const result = st.nextId;
  st.nextId++;
  const delta = { nextId: st.nextId };
  await chrome.storage.local.set(delta);
  return result;
};

export const getKey = async (key) => {
  await initSt();
  return st[key];
}

export const setKey = async (key, val) => {
  lockedUpdate(async () => {
    const changes = {};
    changes[key] = val;
    return changes;
  });
}

export const getJob = async (jobId) => {
  return getKey('job_' + jobId);
}

export const saveJob = async (job) => {
  await initSt();

  if (!job.id) {
    throw 'no job id: ' + JSON.stringify(job);
  }

  const delta = {};
  const key = 'job_' + job.id;
  delta[key] = job;
  st[key] = job;

  console.log('jjj save job:', job.id, job);

  return await chrome.storage.local.set(delta);
};

export const setJobField = async (jobId, field, val) => {
  return lockedJobUpdate(
    jobId,
    (job) => {
      console.log('jjj set job field:', jobId, field, val);
      job[field] = val;
      return job;
    });
}

export const getActiveJob = async () => {
  await initSt();

  if (!st?.activeId) new Promise((ok) => ok(null));

  const activeId = st?.activeId;
  const job = await getJob(activeId);
  if (!job) return new Promise((ok) => ok(null));
  if (!job.id) {
    job.id = activeId;
    return saveJob(job)
      .then(new Promise((ok) => ok(job)));
  } else {
    return new Promise((ok) => ok(job));
  }
};

export const setActiveJob = async (activeId) => {
  await initSt();

  st.activeId = activeId;

  return await chrome.storage.local.set({ activeId });
}

export const setStatus = async (message, roundId, delta) => {
  console.log('setStatus got message:', message);

  lockedUpdate(async (st) => {
    const changes = { status: { message } };

    if (roundId && delta) {
      const a = await isActive(roundId);
      if (a) {
        changes.inFlight = st.inFlight || 0
        changes.inFlight += delta;
      }
    }

    return changes;
  });
}

export const setPercent = async (percent) => {
  lockedUpdate(async (st) => {
    return { percent: Math.max(0.01, Math.min(percent, 0.99)) };
  });
}

export const setScrapeAnswer = async (jobId, url, answer) => {
  console.log('setScrapeAnswer', jobId, url, answer);

  let answers = {};
  answers[url] = answer;

  return setJobResults(jobId, { answers });
}

export const setScrapeStatus = async (jobId, roundId, urls, val) => {
  console.log('setScrapeStatus', jobId, roundId, urls, val);

  return lockedJobUpdate(
    jobId,
    (job) => {
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
}

export const clearJobResults = async (jobId) => {
  console.log('clearJobResults locked update');
  return lockedJobUpdate(
    jobId,
    (job) => {
      job.results = { targets: [], answers: {}};
      return job;
    });
}

export const addUrlsToJob = async (jobId, urls, clearMissing) => {
  return setJobResults(
    jobId,
    {
      targets: urls.map(x => { return { url: x, status: 'new' } }),
    },
    clearMissing);
}

export const removeUrlsFromJob = async (jobId, rmUrls) => {
  console.log('removeUrlsFromJob locked update');
  return lockedJobUpdate(
    jobId,
    (job) => {
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
}

export const setJobResults = async (jobId, { targets, answers }, clearMissing) => {
  console.log('setJobResults locked update');

  return lockedJobUpdate(
    jobId,
    (job) => {
      console.log('setting job results', jobId, job);

      if (!job.results) job.results = {};

      if (targets &&
          !job.urls.shouldClear &&
          job.results.targets) {

        const have = {};
        for (const t of job.results.targets) {
          have[t.url] = true;
        }

        const combined = JSON.parse(JSON.stringify(job.results.targets));
        for (const t of targets) {
          if (!have[t.url]) {
            combined.push(t);
          }
        }

        targets = combined;
        job.urls.shouldClear = false;
      }

      if (targets) job.results.targets = targets;
      if (answers) {
        const guessType = (val) => {
          if (!isNaN(parseFloat(val))) return 'number';
          if (('' + val).match(/^https?:\/\//)) return 'url';
          return 'string';
        }

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
          if (typeCounts[h].url / counts[h] > threshold)
            types[h] = 'url';
          else if (typeCounts[h].number / counts[h] > threshold)
            types[h] = 'number';
          else
            types[h] = 'string';
        }
        job.results.types = types;

        job.results.answers = answers;
      }

      const r = job.results;
      if (r.targets && r.answers) {
        for (const target of r.targets) {
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
}

export const stopActiveJob = async () => {
  return lockedJobUpdate(
    (await getActiveJob()).id,
    (job) => {
      if (!job.results) job.results = {};

      for (const target of (job.results?.targets || [])) {
        if (target.loading) target.status = 'stopped';
        target.loading = false;
      }

      return job;
    });
}
