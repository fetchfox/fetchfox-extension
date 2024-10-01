import { PlasmoMessaging } from "@plasmohq/messaging";
import { runStopListeners } from "~old/src/lib/controller";

const handler: PlasmoMessaging.MessageHandler = async () => {
  runStopListeners();
};

export default handler;
