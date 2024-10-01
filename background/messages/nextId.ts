import { nextId } from "../../old/src/lib/store";
import { PlasmoMessaging } from "@plasmohq/messaging";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  res.send(await nextId());
};

export default handler;
