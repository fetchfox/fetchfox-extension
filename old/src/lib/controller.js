import { useLocal } from "../state/storage";
import { useEffect, useState } from "react";
import { storage } from "~lib/extension";
import { setKey, stopActiveJob, updateKey } from "./store";

let listeners = [];

export const useRoundId = () => {
  const [roundId] = useLocal("roundId");
  return roundId;
};

export const getRoundId = async () => {
  return (await storage.get("roundId")) || 1;
};

export const isActive = async (r) => {
  return r === (await getRoundId());
};

export const addListener = async (f) => {
  if (!listeners.includes(f)) {
    listeners.push(f);
  }
};

export const removeListener = async (f) => {
  const index = listeners.indexOf(f);
  if (index === -1) return;
  listeners.splice(index, 1);
};

export const runStopListeners = () => {
  listeners.forEach((l) => l());
  listeners = [];
};

export const advanceRound = async () => {
  await setKey("inFlight", 0);
  await updateKey("roundId", (old) => (old || 0) + 1);

  runStopListeners();
  return stopActiveJob();
};
