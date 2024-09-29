import { getKey, setKey } from "../../old/src/lib/store";

let consoleMessages = [];
let consoleTimeoutId = null;

export const saveConsole = (key, args) => {
  // Disable for now
  setKey("consoleMessages", []);
  return;

  // Do not put any console.log() statements in here

  const message = ["" + new Date(), key, JSON.stringify(args)]
    .join("\t")
    .substring(0, 5000); // max 5kB per message
  consoleMessages.push(message);

  // Buffer and write
  if (consoleTimeoutId) clearTimeout(consoleTimeoutId);

  consoleTimeoutId = setTimeout(async () => {
    const prev = (await getKey("consoleMessages")) || [];
    consoleMessages = prev.concat(consoleMessages);

    const l = consoleMessages.length;
    const max = 100000;
    if (l > max) {
      consoleMessages = consoleMessages.slice(l - max);
    }

    setKey("consoleMessages", consoleMessages);
    consoleMessages = [];
  }, 1000);
};

export default async function handler(req, res) {
  saveConsole(req.body.key, req.body.args);
}
