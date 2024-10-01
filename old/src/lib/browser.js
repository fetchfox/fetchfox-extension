import Browser from "webextension-polyfill";

async function getTab(tabId) {
  try {
    return await Browser.tabs.get(tabId);
  } catch (err) {
    console.log(err);
    return null;
  }
}

export const checkIfTabExists = async (tabId) => {
  const tab = await getTab(tabId);
  return !!tab;
};

export const closeTabIfExists = async (tabId) => {
  const tab = await getTab(tabId);
  if (tab) {
    await Browser.tabs.remove(tab.id);
  }
};

export const getTabUrl = async (tabId) => {
  const tab = await getTab(tabId);
  return tab?.url ?? null;
};
