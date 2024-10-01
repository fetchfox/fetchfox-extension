import jsonic from "jsonic";
import JSON5 from "json5";
import { createClient } from "openai-tokens";
import OpenAI from "openai";
import { apiHost } from "./constants";
import { setKey, getKey, setStatus } from "./store";
import { getCache, setCache } from "./cache";
import { getRoundId } from "./controller";
import { setGlobalError } from "./errors";
import { getTemplate } from "./templates";
import { sleep, parseJsonl } from "./util";

const recommendModel = "gpt-4o-mini";
const queryLogCutoff = 1; // 1 minute
let queryLog = [];
let observedRateLimit = 1000000; // tpm, a guess that adjusts
let tpmTimeoutId;

export async function estimateTokens(prompt) {
  // TODO: more accurate token estimation
  return prompt.length / 4;
}

export async function exec(name, args, cb, modelOverride) {
  const model = modelOverride ? modelOverride : await getModel();
  const plan = await getKey("openAiPlan");

  const keys = [model, plan, name, args];
  const cached = await getCache("ai", keys);
  if (cached) return cached;

  let answer;
  let askAI;

  if (plan === "free") {
    console.log("AI using Free");

    // Run via mirror API
    askAI = async (name, args) => {
      const url = apiHost + "/api/mirror";
      const body = JSON.stringify({ template: name, ...args });
      console.log("making mirror request", url, name);
      const resp = await fetch(url, { method: "POST", body });
      const data = await resp.json();
      console.log("got data response", data);
      if (data.error) {
        throw data.error;
      }

      return {
        answer: data.answer,
        usage: data.usage,
      };
    };
  } else {
    console.log("AI using OpenAI key");

    // Run via user's API key
    askAI = async (name, args) => {
      const prompt = render(name, args);
      console.log("Sending prompt to openai:", prompt);
      console.log("modelOverride?", modelOverride);
      const resp = await stream(
        prompt,
        (text) => cb && cb(parseAnswer(text)),
        model
      );

      return { answer: resp.result, usage: resp.usage };
    };
  }

  let retries = 3;
  while (true) {
    const rate = await checkRateLimit(render(name, args), plan);

    setKey("tpm", rate);
    if (tpmTimeoutId) {
      clearTimeout(tpmTimeoutId);
      tpmTimeoutId = null;
    }
    tpmTimeoutId = setTimeout(() => setKey("tpm", null), 15000);
    console.log("Check rate limit gave", rate, "limit:", observedRateLimit);

    let hitRateLimit = false;
    let resp;

    try {
      resp = await askAI(name, args);
      console.log("AI resp:", resp);
    } catch (e) {
      console.error("AI error:", e);
      console.log("AI error retries left:", retries);

      if (e.code === "insufficient_quota") {
        setGlobalError(
          "You have no OpenAI quota. Add credits, or switch to the FetchFox backend."
        );
        return;
      } else if (e.code === "rate_limit_exceeded" && retries > 0) {
        observedRateLimit *= 0.9;
        console.log(
          "Query rate limit hit, set new observedRateLimit:",
          observedRateLimit
        );
        hitRateLimit = true;
      } else if (
        e.code === "rate_limit_exceeded" &&
        plan === "free" &&
        retries <= 0
      ) {
        console.error("Too many errors, giving up on AI query");
        setGlobalError(
          "High load! " +
            "Please try again later, or enter your OpenAI API key in settings."
        );
        return;
      } else {
        setGlobalError("" + e);
        return;
      }
    }

    if (hitRateLimit) {
      console.log("Check rate limit RETRY");
      setStatus("AI rate limit hit, slowing down...");
      retries--;
      await sleep(2000);
    } else {
      answer = resp.answer;
      await addUsage(resp.usage);
      // Slowly grow rate limit until we hit it again
      observedRateLimit *= 1.005;
      break;
    }
  }

  const out = parseAnswer(answer);
  setCache("ai", keys, out);
  return out;
}

export async function stream(prompt, cb, model) {
  const openai = new OpenAI({
    apiKey: await getKey("openAiKey"),
    dangerouslyAllowBrowser: true,
  });

  console.log("Using model:", model);

  const stream = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    stream_options: { include_usage: true },
  });

  let result = "";
  let usage;
  for await (const chunk of stream) {
    if (chunk.usage) {
      usage = chunk.usage;
    }

    if (chunk.choices?.length) {
      const delta = chunk.choices[0].delta.content;
      if (delta) result += delta;
      cb && cb(result);
    }
  }

  console.log("AI gave result:", result);
  console.log("AI gave stream:", stream);
  console.log("clip final result", result, usage);

  const out = { result, usage };
  return out;
}

const checkRateLimit = async (prompt, plan) => {
  // Rate limit check
  const count = await estimateTokens(prompt);
  let timestamp;
  let total;
  while (true) {
    timestamp = Math.floor(new Date().getTime() / 1000);
    queryLog = queryLog.filter(
      (q) => q.timestamp >= timestamp - queryLogCutoff * 60
    );
    total = queryLog.reduce((acc, q) => acc + q.count, 0);

    // If below rate limit, continue with query
    if ((total + count) / queryLogCutoff < observedRateLimit) break;

    setStatus("Waiting for AI rate limit...");
    console.log("Check rate limit WAITING");

    await sleep(3000);
  }

  queryLog.push({ count, timestamp });
  const rate = Math.round((total + count) / queryLogCutoff);

  console.log(
    "Query rate count:",
    rate,
    "tokens per",
    queryLogCutoff,
    "minutes"
  );

  return rate;
};

const render = (name, args) => {
  const template = getTemplate(name);
  let prompt = template;
  for (const key of Object.keys(args)) {
    const val = args[key] || "";
    prompt = prompt.replaceAll("{{" + key + "}}", val);
  }
  return prompt;
};

const parseAnswer = (text) => {
  if (!text) return;
  const clean = text
    .replace(/```jsonl?/, "")
    .replace("```", "")
    .replaceAll(/^`+|`+$/g, "");

  // Try to parse it as JSON
  try {
    return JSON5.parse(clean);
  } catch (e) {
    // It was not JSON
  }

  // Try to parse it as JSONL
  let data;
  try {
    data = parseJsonl(clean);
  } catch (e) {
    console.warn("Unable to parse partial response:", clean, e);
  }
  if (data && data.length > 0) {
    return data;
  }

  // We don't know what it is, return null
  return null;
};

export const getAvailableModels = async () => {
  const apiKey = await getKey("openAiKey");
  if (!apiKey) return [];

  const resp = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: "Bearer " + apiKey },
  });
  const data = await resp.json();

  if (!data?.data) {
    setGlobalError(
      `We couldn't find any available models. Double check your API key`
    );
    return [];
  }

  const modelIds = data.data.map((m) => m.id);
  console.log("Available models:", modelIds);

  return sort(modelIds, (id) => {
    if (id === recommendModel) return -Infinity; // put first

    const match = id.match(/gpt-([0-9]+)/);
    if (match) return Infinity; // put last

    return parseInt(match[1]);
  });
};

export const getModel = async () => {
  const model = await getKey("model");
  if (model) return model;

  const models = await getAvailableModels();
  const use = models[0];
  console.log("Setting model:", use);
  setKey("model", use);
  return use;
};

const addUsage = async (usage) => {
  const roundId = await getRoundId();
  const key = "roundUsage_" + roundId;
  console.log("Set usage for:", key);
  const current = (await getKey(key)) || { prompt: 0, completion: 0, total: 0 };
  console.log("Got previous usage:", current);
  console.log("Adding new usage:", usage);
  current.prompt += usage.prompt_tokens;
  current.completion += usage.completion_tokens;
  current.total += usage.total_tokens;
  console.log("Setting new usage", key, current);
  return setKey(key, current);
};
