import { PlasmoMessaging } from "@plasmohq/messaging";
import { reportBug } from "~background/shared";

const handler: PlasmoMessaging.MessageHandler = async (_, res) => {
  const resp = await reportBug();
  res.send(resp);
};

export default handler;
