import { sendReport } from "../../old/src/lib/report";
import { getKey } from "../../old/src/lib/store";

const reportBug = async () => {
  const messages = (await getKey("consoleMessages")) || [];
  return sendReport(messages.join("\n"));
};

/**
 * @type {import("@plasmohq/messaging").PlasmoMessaging.MessageHandler}
 */
const handler = async (_, res) => {
  const resp = await reportBug();
  res.send(resp);
};

export default handler;
