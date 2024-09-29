import { setStatus } from "../../old/src/lib/store";

export default async function handler(req) {
  setStatus(req.body.message);
}
