import { PlasmoMessaging } from "@plasmohq/messaging";
import { reportSleep } from "~old/src/lib/navigation";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const resp = await reportSleep(req.body.url, req.body.msec);
  res.send(resp);
};

export default handler;
