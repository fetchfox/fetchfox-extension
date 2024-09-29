import { exec } from "../../old/src/lib/ai";
import { getActiveJob } from "../../old/src/lib/store";

const checkLoading = async (text, html) => {
  // TODO: re-enable this after dev done
  // if (true) {
  //   return { status: 'ok', answer: { status: 'done' } };
  // }

  const job = await getActiveJob();
  if (!job) {
    // Hack...
    return { status: "ok", answer: { status: "done" } };
  }

  const answer = await exec("checkLoading", {
    text: text.substring(0, 10000),
    html: html.substring(0, 30000),
    questions: JSON.stringify(job.scrape?.questions || [])
  });

  if (!answer) {
    return { status: "error" };
  }
  return { status: "ok", answer };
};

export default async function handler(req, res) {
  const resp = await checkLoading(req.body.text, req.body.html);
  res.send(resp);
}
