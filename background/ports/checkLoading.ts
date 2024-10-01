import { PlasmoMessaging } from "@plasmohq/messaging";
import { checkLoading } from "~background/shared";

const handler: PlasmoMessaging.PortHandler = async (req, res) => {
  const resp = await checkLoading(req.body.text, req.body.html);
  res.send(resp);
};

export default handler;
