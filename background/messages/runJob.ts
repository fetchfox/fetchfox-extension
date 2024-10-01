import { PlasmoMessaging } from "@plasmohq/messaging";
import { runJob } from "~background/shared";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  await runJob(req.body.job, req.body.tabId);
};

export default handler;
