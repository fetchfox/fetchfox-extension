import { setKey, getKey } from './store.mjs';

export const setGlobalError = async (message) => {
  return setKey('globalError', { message });
}

export const clearGlobalError = async () => {
  return setKey('globalError', null);
}

export const getGlobalError = async () => {
  return getKey('globalError');
}
