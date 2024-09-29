export const checkIfTabExists = async (tabId) => {
  return new Promise((ok) => {
    chrome.tabs.get(tabId, () => ok(!chrome.runtime.lastError))
  });
}

export const closeTabIfExists = async (tabId) => {
  return new Promise((ok) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return;
      }
      chrome.tabs.remove(tab.id, ok);
    })
  });
}

export const getTabUrl = async (tabId) => {
  return new Promise((ok) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        ok(null)
      } else {
        ok(tab.url)
      }
    })
  });
}
