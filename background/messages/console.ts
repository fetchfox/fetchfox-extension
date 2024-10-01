import { PlasmoMessaging } from "@plasmohq/messaging";
import { saveConsole } from "~background/shared";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  saveConsole(req.body.key, req.body.args);
};

export default handler;
