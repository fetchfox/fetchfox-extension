import { useMemo, useEffect, useState } from 'react';
import {
  getJob,
  getActiveJob,
} from '../lib/store.mjs';


export const useJobs = () => {
  const [jobs, setJobs] = useState([]);

  const update = () => {
    chrome.storage.local.get().then((st) => {
      const j = Object.keys(st)
        .filter(k => k.startsWith('job_'))
        .map(k => parseInt(k.replace('job_', '')))
        .sort((a, b) => b - a)
        .map(k => st['job_' + k]);

      setJobs(j);
    });
  };

  useEffect(() => {
    update();
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, []);

  return jobs;
}

export const useJob = (jobId) => {
  const [job, setJob] = useState();

  const update = (changes) => {
    if (changes['job_' + jobId]) {
      setJob(changes['job_' + jobId].newValue)
    }
  };

  useEffect(() => {
    if (!jobId) return;
    getJob(jobId).then(j => {
      setJob(j);
    });

    chrome.storage.onChanged.addListener(update);
    return () => {
      chrome.storage.onChanged.removeListener(update);
    }
  }, [jobId]);

  return job;
}

export const useActiveJob = () => {
  const [activeId, setActiveId] = useState();
  const active = useJob(activeId);

  const update = (changes) => {
    if (changes.activeId) {
      setActiveId(changes.activeId.newValue);
    }
  };

  useEffect(() => {
    getActiveJob().then(j => {
      if (!j) return;
      setActiveId(j.id);
    });
    chrome.storage.onChanged.addListener(update);
    return () => chrome.storage.onChanged.removeListener(update);
  }, []);

  return active;
}
