import { PlasmoMessaging } from "@plasmohq/messaging";
import { runScrape } from "~background/shared";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  await runScrape(req.body.job, req.body.urls);
};

export default handler;
