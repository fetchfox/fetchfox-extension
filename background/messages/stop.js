import { runStopListeners } from "../../old/src/lib/controller";

export default async function handler() {
  await runStopListeners();
}
