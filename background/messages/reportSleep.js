import { reportSleep } from "../../old/src/lib/navigation";

export default async function handler(req, res) {
  const resp = await reportSleep(req.body.url, req.body.msec);
  res.send(resp);
}
