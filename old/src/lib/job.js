import { sendToBackground } from "@plasmohq/messaging";
import { webExtension } from "~old/src/lib/browser";

export const runJob = async (job) => {
  const [current] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = current.url === job.urls?.url ? current.id : null;
  return sendToBackground({ name: "runJob", body: { job, tabId } });
};

export const runGather = async (job) => {
  const [current] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = current.url === job.urls?.url ? current.id : null;
  return sendToBackground({ name: "runGather", body: { job, tabId } });
};

export const runScrape = async (job, urls) => {
  return sendToBackground({ name: "runScrape", body: { job, urls } });
};

export const sendStopMessage = async () => {
  return sendToBackground({ name: "stop" });
};

// TODO: use this pattern for most/all future functiosn in this file
// TODO: rename this file to something reflecting this new pattern
export const sendNextIdMessage = async () => {
  console.log("sendNextIdMessage 1");
  const res = sendToBackground({ name: "nextId" });
  console.log("sendNextIdMessage 2", res);
  return res;
};
