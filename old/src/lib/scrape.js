import { exec } from "./ai";
import { sleep } from "./util";
import { setStatus } from "./store";
import { getRoundId, isActive } from "./controller";
import { scrapeTemplate } from "./templates";

export const scrapePage = async (
  page,
  questions,
  perPage,
  itemDescription,
  extraRules,
  cb
) => {
  const roundId = await getRoundId();
  if (!(await isActive(roundId))) return;

  const translateToHeaders = (questions) => {
    const result = {};
    let i = 0;
    for (let q of questions) {
      if (q === "") continue;
      result[q] = "";
    }
    return result;
  };

  const clip = 60000;
  const len = page.text.length + page.html.length;
  const percentHtml = page.html.length / len;
  const textChunkSize = Math.floor(clip * (1 - percentHtml));
  const htmlChunkSize = Math.floor(clip * percentHtml);

  console.log("clip page:", page);
  console.log("clip should we clip?", len, clip);
  console.log("clip len text", page.text.length);
  console.log("clip len html", page.html.length);

  let expectedItemCount;

  const scrapeInner = async (offset, existing, cb) => {
    const text = page.text.slice(
      offset * textChunkSize,
      (offset + 1) * textChunkSize
    );

    const html = page.html.slice(
      offset * htmlChunkSize,
      (offset + 1) * htmlChunkSize
    );

    console.log("building prompt using perPage", perPage);

    let perPageCopy;
    if (perPage === "single") {
      perPageCopy =
        "You should look for a SINGLE item on this page, expect itemCount === 1";
    } else if (perPage === "multiple") {
      perPageCopy =
        "You should look for MULTIPLE items on this page, expect itemCount > 1. Be sure to FIND ALL THE ITEMS";
    } else {
      perPageCopy =
        "The user wants you to GUESS how many items are on this page, itemCount may be 1 or more than 1";
    }

    const context = {
      url: page.url,
      questions: JSON.stringify(translateToHeaders(questions), null, 2),
      itemDescription,
      perPageCopy,
      text,
      html,
      extraRules,
      count: "",
    };

    if (itemDescription) {
      context.itemDescription =
        "You are looking for this type of item(s):\n\n" + itemDescription;
    }

    console.log("manual scrape sending context", context);

    let prevLength = 1; // set it to 1 to ignore itemCount row
    const a = await exec("scrape", context, async (partial) => {
      if (partial?.length && partial[0].itemCount) {
        expectedItemCount = partial[0].itemCount;
      }

      if (cb && partial && partial.length > prevLength) {
        if (!(await isActive(roundId))) return answer;
        const items = existing.concat(partial.slice(1));

        let percent =
          offset / numChunks +
          (1 / numChunks) * (items.length / expectedItemCount);
        // Slow down percent above cap in case AI mis-estimated
        const cap = 0.7;
        if (percent > cap) {
          percent = cap + (percent - cap) * 0.5;
        }

        cb({ items, percent });
        console.log(
          `clip partial ${items.length} of expected ${expectedItemCount}`
        );
        prevLength = partial.length;
      }
    });

    const ensureArray = (x) => {
      if (!x) return [];
      if (!Array.isArray(x)) return [x];
      return x;
    };

    console.log("Scrape answer:", a);

    const localAnswer = ensureArray(a).filter(
      (i) => i.itemCount === undefined || Object.keys(i).length > 1
    );

    let single = false;
    if (localAnswer.length === 1) {
      single = true;
      for (const key of Object.keys(localAnswer[0])) {
        if (!localAnswer[0][key]) single = false;
      }
    }

    return {
      answer: localAnswer,
      single,
      more:
        page.text.length > (offset + 1) * textChunkSize ||
        page.html.length > (offset + 1) * htmlChunkSize,
    };
  };

  let answer = [];
  let offset = 0;

  const max = perPage === "single" ? 3 : 20;
  const numTextCunks = page.text.length / textChunkSize;
  const numHtmlCunks = page.html.length / htmlChunkSize;
  const numChunks = Math.ceil(
    Math.min(max, Math.max(numTextCunks, numHtmlCunks))
  );
  for (let i = 0; i < max; i++) {
    console.log(`clip iteration ==> ${offset}/${numChunks}`);
    const result = await scrapeInner(offset++, answer, cb);

    console.log("clip iteration result gave:", result);
    console.log("clip scrape inner gave:", result.answer);
    console.log("clip is there more?", result.more);

    if (!(await isActive(roundId))) return answer;
    answer = answer.concat(result.answer);

    console.log("clip combined answer:", answer);

    if (!result.more) break;
    if (result.single) break;
  }

  setStatus("Result: " + JSON.stringify(Object.values(answer[0] || {})));
  return answer;
};
