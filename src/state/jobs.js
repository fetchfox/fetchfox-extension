import { storage, useLocal } from "./storage";
import { sift, sort } from "radash";
import { useEffect, useMemo, useState } from "react";

export const useJobs = () => {
  const [jobs, setJobs] = useState({});
  const [jobIds] = useLocal("jobs_ids");

  useEffect(() => {
    const keys = jobIds || [];

    const listeners = {};
    keys.forEach((id) => {
      const key = 'job_' + id;
      listeners[key] = async (c) => {
        setJobs((old) => ({ ...old, [id]: c.newValue }));
      };
    });

    storage.watch(listeners);
    return () => storage.unwatch(listeners);
  }, []);

  return useMemo(() => {
    const sortedJobIds = sort(jobIds || [], (it) => parseInt(it), true);
    const sortedJobs = sortedJobIds.map((id) => jobs[id]);
    return sift(sortedJobs);
  }, [jobIds, jobs]);
};

export const useJob = (jobId) => {
  // const [didInit, setDidInit] = useState(false);
  const [jobIdKey, setJobIdKey] = useState('job_' + jobId);
  const [job] = useLocal(jobIdKey);
  const [result, setResult] = useState({
    job,
    didInit: false,
  });

  useEffect(() => {
    setJobIdKey('job_' + jobId);
  }, [jobId]);

  useEffect(() => {
    console.log('*** active job', jobIdKey, job);
    const r = { job, didInit: true };
    //console.log('??? active RESULT', r);
    setResult(r);
  }, [job]);

  // useEffect(() => {
  //   setResult({ job: null, didInit: false, a: 1 });
  // }, [jobId]);
  // useEffect(() => {
  //   console.log('-->active get:', job, jobId);
  //   if (jobId === undefined) {
  //     setResult({ job: null, didInit: true, b: 2 });
  //   } else if (job == 'loading') {
  //     setResult({ job: null, didInit: false, c: 3 });
  //   } else {
  //     console.log('active job is now:', job);
  //     setResult({ job, didInit: true, d: 4 });
  //   }
  // }, [job]);
  // console.log('ACTIVE return result', result);

  return result;
};

export const useActiveJob = () => {
  // const [activeId] = useLocal("activeId");
  const activeId = 1;
  console.log('==>get job with activeId', activeId);
  return useJob(activeId);
};
