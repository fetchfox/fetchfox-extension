import { getActiveTab } from "../../lib/navigation";

export const mainStyle = {
  padding: 10,
  paddingBottom: 100,
  color: "white",
  width: "100%",
};

export const stepStyle = {
  borderRadius: 5,
  padding: 10,
  background: "#fff2",
  marginBottom: 20,
};

export const stepHeaderStyle = {
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 10,
};

const openPanel = async () => {
  const activeTab = await getActiveTab();
  await chrome.sidePanel.open({ windowId: activeTab.windowId });

  // TODO: remove need for setTimeout
  setTimeout(() => window.close(), 50);
};

export const maybeOpenPanel = async (job) => {
  let shouldOpen = true;

  if (!(job.scrape?.concurrency < 0)) shouldOpen = false;
  if (job.urls?.action === "current") shouldOpen = false;
  if (job.urls?.pagination?.follow) shouldOpen = true;

  if (shouldOpen) openPanel();
};
