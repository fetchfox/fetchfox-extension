import * as Sentry from '@sentry/react';
import { sentryDsn } from './constants.mjs';
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

export const initSentry = () => {
  // if (chrome.runtime.getManifest()
  // return;

  Sentry.init({
    dsn: sentryDsn,
    beforeSend(event, hint) {
      const err = hint.originalException;
      console.error(err);
      setGlobalError('We noticed an error: ' + err.message);
      return event;
    }
  });
}