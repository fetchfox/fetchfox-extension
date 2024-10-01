import { PlasmoMessaging } from "@plasmohq/messaging";
import { setStatus } from "../../old/src/lib/store";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  setStatus(req.body.message);
};

export default handler;
