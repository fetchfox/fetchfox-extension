import { useEffect, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { IoMdCloseCircle } from "react-icons/io";
import { getRoundId } from "../../lib/controller";
import { runScrape } from "../../lib/job";
import { setJobField, setScrapeStatus } from "../../lib/store";
import { useAutoSleepTime } from "../../state/util";
import { stepHeaderStyle, stepStyle, maybeOpenPanel } from "./shared";

export const ScrapeStep = ({ job, isPopup }) => {
  const [questions, setQuestions] = useState([""]);
  const [concurrency, setConcurrency] = useState();
  const [sleepTime, setSleepTime] = useState();

  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults === 0 ? 1 : 2;
  const autoSleepTime = useAutoSleepTime();

  console.log("autoSleepTime", autoSleepTime);

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!job?.scrape) return;
    setQuestions(job.scrape?.questions || [""]);
    setConcurrency(job.scrape?.concurrency || 3);
    setSleepTime(job.scrape?.sleepTime || "auto");
  }, [job]);

  if (!job) return null;

  const updateJob = async (field, val, setter) => {
    setter(val);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const updated = JSON.parse(JSON.stringify(job.scrape));
    updated[field] = val;

    let hasScraped = false;
    for (const target of job?.results?.targets || []) {
      hasScraped = target.status === "scraped";
      if (hasScraped) break;
    }

    hasScraped = true;

    timeoutRef.current = setTimeout(async () => {
      if (hasScraped) {
        await setJobField(job.id, "scrape", updated);
        if (field === "questions") {
          setScrapeStatus(
            job.id,
            await getRoundId(),
            (job.results?.targets || []).map((t) => t.url),
            "found"
          );
        }
      } else {
        setJobField(job.id, "scrape", updated);
      }
    }, 200);
  };

  const updateConcurrency = (val) =>
    updateJob("concurrency", val, setConcurrency);
  const updateSleepTime = (val) => updateJob("sleepTime", val, setSleepTime);

  const updateQuestion = async (index, val) => {
    const q = JSON.parse(JSON.stringify(questions));
    q[index] = val;
    updateJob("questions", q, setQuestions);
  };

  const removeQuestion = (index) => {
    const q = JSON.parse(JSON.stringify(questions));
    q.splice(index, 1);
    updateJob("questions", q, setQuestions);
  };

  const addQuestion = () => {
    const q = JSON.parse(JSON.stringify(questions));
    q.push("");
    updateJob("questions", q, setQuestions);
  };

  let i = 0;
  const nodes = questions.map((q) => {
    const index = i++;
    return (
      <div
        key={index}
        style={{ display: "flex", alignItems: "center", gap: 5 }}
      >
        <div style={{ width: "100%" }}>
          <input
            style={{ width: "100%", marginBottom: 5 }}
            placeholder={'eg: "What is the star rating of this product?"'}
            value={q}
            onChange={(e) => updateQuestion(index, e.target.value)}
          />
        </div>
        <div>
          <IoMdCloseCircle
            style={{ cursor: "pointer", opacity: 0.8 }}
            size={16}
            onClick={() => removeQuestion(index)}
          />
        </div>
      </div>
    );
  });

  const controlsNode = (
    <div style={{ display: "flex", flexDirection: "row", gap: 5 }}>
      <div style={{ width: "60%" }}>
        <p>Max tabs at once. Reduce if you hit rate limits.</p>
        <select
          style={{ width: "100%" }}
          value={concurrency}
          onChange={(e) => updateConcurrency(e.target.value)}
        >
          <option value=""></option>
          <optgroup label="Foreground tabs">
            <option value={-1}>1 foreground tab</option>
            <option value={-2}>2 foreground tabs</option>
            <option value={-3}>3 foreground tabs</option>
            <option value={-5}>5 foreground tabs</option>
            <option value={-10}>10 foreground tabs (careful!)</option>
          </optgroup>
          <optgroup label="Background tabs">
            <option value={1}>1 (slowest, least likely to be blocked)</option>
            <option value={2}>2 </option>
            <option value={3}>3 (default)</option>
            <option value={5}>5 </option>
          </optgroup>
          <optgroup label="Danger Zone - Sites may block you at these rates">
            <option value={10}>10 (very fast, some sites may block)</option>
            <option value={25}>25 (even faster, many sites will block)</option>
            <option value={50}>
              50 (warp speed! you're gonna see some captchas)
            </option>
          </optgroup>
        </select>
      </div>

      <div style={{ width: "40%" }}>
        <p>Wait time before extraction</p>
        <select
          style={{ width: "100%" }}
          value={sleepTime}
          onChange={(e) => updateSleepTime(e.target.value)}
        >
          <option value=""></option>
          <optgroup label="Automatically adjust">
            <option value="auto">
              Auto
              {autoSleepTime?.pretty && ` (${autoSleepTime.pretty})`}
            </option>
          </optgroup>
          <optgroup label="Manual">
            <option value={2000}>2 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
          </optgroup>
        </select>
      </div>
    </div>
  );

  const handleClick = async () => {
    let urls = job.results.targets
      .filter((t) => t.status !== "scraped")
      .map((t) => t.url);

    if (urls.length === 0) {
      urls = job.results.targets.map((t) => t.url);
    }

    if (isPopup) {
      await maybeOpenPanel(job);
    }

    return runScrape(job, urls);
  };

  return (
    <div style={stepStyle}>
      <div style={stepHeaderStyle}>
        What do you want to scrape on{" "}
        {job.urls?.action === "current" ? "this" : "each"} page?
      </div>
      {nodes}

      <div
        className="btn btn-gray"
        style={{
          display: "flex",
          alignItems: "center",
          width: 92,
          justifyContent: "center",
        }}
        onClick={() => addQuestion()}
      >
        <FiPlus size={14} />
        &nbsp;Add Field
      </div>

      {["gather", "manual"].includes(job.urls?.action) && controlsNode}

      {job.urls.action === "gather" && (
        <div style={{ marginTop: 10 }}>
          <button
            className={"btn btn-gray btn-md"}
            style={{ width: "100%" }}
            disabled={currentStep < 2}
            onClick={handleClick}
          >
            Run Only Extraction
          </button>
        </div>
      )}
    </div>
  );
};
