import { PlasmoMessaging } from "@plasmohq/messaging";
import { runGather } from "~background/shared";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  runGather(req.body.job, req.body.tabId);
};

export default handler;
