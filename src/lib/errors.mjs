import * as Sentry from '@sentry/react';
import { sentryDsn } from './constants.mjs';
import { setKey, getKey } from './store.mjs';

let timeoutId = null;

export const setGlobalError = async (message) => {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(clearGlobalError, 5000);
  return setKey('globalError', { message });
}

export const clearGlobalError = async () => {
  return setKey('globalError', null);
}

export const getGlobalError = async () => {
  return getKey('globalError');
}

export const initSentry = () => {
  https://stackoverflow.com/questions/12830649/check-if-chrome-extension-installed-in-unpacked-mode
  if (!('update_url' in chrome.runtime.getManifest())) {
    return;
  }

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
