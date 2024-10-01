import { Storage } from "@plasmohq/storage";
import { getPort } from "@plasmohq/messaging/port";

export const storage = new Storage();

export function sendPortMessage(portName, body) {
  return new Promise((resolve, reject) => {
    const port = getPort(portName);
    port.onMessage.addListener(resolve);
    port.onDisconnect.addListener(() => reject("port disconnected"));
    port.postMessage({ body });
  });
}
