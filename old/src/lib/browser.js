import Browser from 'webextension-polyfill';

async function getTab(tabId) {
  return new Promise((ok) => {
    Browser.tabs.get(tabId, (tab) => {
      ok(Browser.runtime.lastError && tab ? tab : null);
    });
  });
}

export const checkIfTabExists = async (tabId) => {
  const tab = await getTab(tabId);
  return !!tab;
};

export const closeTabIfExists = async (tabId) => {
  const tab = await getTab(tabId);
  if (tab) {
    return new Promise((ok) => Browser.tabs.remove(tab.id, ok));
  }
};

export const getTabUrl = async (tabId) => {
  const tab = await getTab(tabId);
  return tab?.url ?? null;
};
