/*
function getWebExtensionGlobal() {
  // if (typeof browser !== "undefined") return browser;
  // if (typeof chrome !== "undefined") return chrome;

  // throw new Error("couldn't locate webextension support");
  return chrome
}

export const webExtension = getWebExtensionGlobal();
*/

async function getTab(tabId) {
  try {
    return await chrome.tabs.get(tabId);
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
    await chrome.tabs.remove(tab.id);
  }
};

export const getTabUrl = async (tabId) => {
  const tab = await getTab(tabId);
  return tab?.url ?? null;
};
