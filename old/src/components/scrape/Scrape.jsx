import fox from "data-base64:~assets/fox-transparent.png";
import { useEffect, useState } from "react";
import { FaFileCsv } from "react-icons/fa6";
import { HiMiniPencilSquare } from "react-icons/hi2";
import { IoMdSettings } from "react-icons/io";
import { getRoundId } from "../../lib/controller";
import { downloadJobCsv } from "../../lib/csv";
import { genBlankJob } from "../../lib/gen";
import { runJob, runScrape } from "../../lib/job";
import { getActiveTab } from "../../lib/navigation";
import {
  clearJobResults,
  getKey,
  removeUrlsFromJob,
  saveJob,
  setActiveJob,
  setJobResults,
  setKey,
  setScrapeStatus,
} from "../../lib/store";
import { getJobUrl } from "../../lib/util";
import { useActiveJob } from "../../state/jobs";
import { useOpenAiKey, useQuota } from "../../state/openai";
import { GlobalError } from "../common/GlobalError";
import { HelpBar } from "../common/HelpBar";
import { Loading } from "../common/Loading";
import { OpenAiKeyEntry } from "../openai/OpenAiKeyEntry";
import { Share } from "../share/Share";

import { Results } from "./Results";
import { Welcome } from "./Welcome";
import { ScrapeStep } from "./ScrapeStep";
import { StatusBar } from "./StatusBar";
import { UrlsStep } from "./UrlsStep";

import "./Scrape.css";
import { mainStyle, maybeOpenPanel } from "./shared";

const Inner = ({ isPopup, onNewJob, onShowSettings }) => {
  const { loading: loadingOpenAiKey } = useOpenAiKey("loading");
  const job = useActiveJob();

  console.log("Active job:", job);
  const handleScrape = async (urls) => {
    return runScrape(job, urls);
  };

  const handleRemove = async (urls) => {
    console.log("remove these target urls:", urls);
    removeUrlsFromJob(job.id, urls);
  };

  const clearAll = async () => {
    clearJobResults(job.id);
  };

  const clearScrape = async () => {
    await setJobResults(job.id, { answers: {} }, true);
    await setScrapeStatus(
      job.id,
      await getRoundId(),
      (job.results?.targets || []).map((t) => t.url),
      "new"
    );
  };

  if (loadingOpenAiKey) {
    return null;
  }

  const handleRun = async () => {
    if (isPopup) {
      await maybeOpenPanel(job);
    }
    runJob(job);
  };

  const currentStep = (job?.results?.targets || []).length === 0 ? 1 : 2;
  const noAnswers =
    (job?.results?.targets || []).filter((r) => !!r.answer).length === 0;

  const controlsNode = (
    <div>
      <button
        className="btn btn-gray"
        disabled={currentStep < 2}
        onClick={() => downloadJobCsv(job)}
      >
        <FaFileCsv size={12} /> Download CSV
      </button>{" "}
      <Share job={job} />{" "}
      <button
        className="btn btn-gray"
        disabled={currentStep < 2}
        onClick={clearAll}
      >
        Clear All Data
      </button>{" "}
      <button
        className="btn btn-gray"
        disabled={currentStep < 2 || noAnswers}
        onClick={clearScrape}
      >
        Clear Answers
      </button>
    </div>
  );

  return (
    <div style={mainStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {/*<pre>{JSON.stringify(job, null, 2)}</pre>*/}

        <div>
          <img src={fox} style={{ width: 32, height: 32 }} />
        </div>

        <div
          style={{
            width: "100%",
            textAlign: "left",
            fontSize: 14,
            fontWeight: "bold",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {job?.name}
        </div>
        <div style={{ whiteSpace: "nowrap" }}>
          <button className="btn btn-gray" onClick={onNewJob}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <HiMiniPencilSquare size={14} /> New Scrape
            </div>
          </button>
        </div>
        <div>
          <div
            style={{ cursor: "pointer", position: "relative", top: 1 }}
            onClick={onShowSettings}
          >
            <IoMdSettings size={24} />
          </div>
        </div>
      </div>

      <UrlsStep job={job} isPopup={isPopup} />

      <ScrapeStep job={job} isPopup={isPopup} />

      <br />
      <br />

      {(job?.results?.targets || []).length > 0 && controlsNode}

      <Results
        job={job}
        targets={job?.results?.targets || []}
        onScrape={handleScrape}
        onRemove={handleRemove}
      />

      <StatusBar onRun={handleRun} />
    </div>
  );
};

export const Scrape = ({ isPopup }) => {
  const {
    key: openAiKey,
    plan: openAiPlan,
    loading: loadingOpenAiKey,
  } = useOpenAiKey("loading");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState();
  const quota = useQuota();

  const activeJob = useActiveJob();

  useEffect(() => {
    console.log("what should we do?", openAiPlan, openAiKey, loading);

    if (loadingOpenAiKey) return;
    setLoading(false);
    if (step === "settings") return;

    if (!openAiPlan || (openAiPlan === "openai" && !openAiKey)) {
      setStep("settings");
    } else {
      if (!step) setStep("welcome");
    }
  }, [openAiKey, openAiPlan, loadingOpenAiKey]);

  useEffect(() => {
    if (!activeJob) return;
    if (!loading) return;

    console.log("activeJob changed, check if we need to change the step", step);

    getActiveTab().then(async (tab) => {
      const jobUrl = getJobUrl(activeJob) || "";
      const tabUrl = tab ? tab.url : "";
      const tabHostname = tabUrl ? new URL(tabUrl).hostname : "";

      const inFlight = await getKey("inFlight");
      if (inFlight > 0) {
        // Job is running, go to inner page
        setStep("inner");
        setLoading(false);
      } else if (jobUrl && jobUrl.indexOf(tabHostname) === -1) {
        // New domain, assume new job
        console.log("new domain, so change the step");
        setStep("welcome");
        setLoading(false);
      } else {
        // Pick up where we left off
        console.log("not changing step");
        setStep((await getKey("scrapeStep")) || "welcome");
        setLoading(false);
      }
    });
  }, [activeJob]);

  const handleSkip = async () => {
    if (!activeJob) {
      console.log("handleSkip 1");
      console.log("handleSkip 1.1");
      try {
        console.log("handleSkip 1.2");
        const job = await genBlankJob();
        console.log("handleSkip 1.25", job);
        handleStart(job);
        console.log("handleSkip 1.3");
      } catch (err) {
        console.log("fucking error", err);
      } finally {
        console.log("wtf?");
      }
    } else {
      console.log("handleSkip 2");
      await setKey("scrapeStep", "inner");
      setStep("inner");
    }
  };

  const handleStart = async (job) => {
    console.log("handleStart", job);

    await saveJob(job);
    await setActiveJob(job.id);
    await setKey("scrapeStep", "inner");
    await setStep("inner");
    setKey("masterPrompt", "");
    window.scrollTo(0, 0);
  };

  const handleNew = async () => {
    await setKey("scrapeStep", "welcome");
    await setStep("welcome");
  };

  let body;

  if (loading || loadingOpenAiKey) {
    body = (
      <div style={{ padding: 50, textAlign: "center", color: "white" }}>
        <Loading size={50} />
        <p>loading? {"" + loading}</p>
        <p>loadingOpenAiKey? {"" + loadingOpenAiKey}</p>
      </div>
    );
  } else if (!quota.ok || step === "settings") {
    body = (
      <div style={mainStyle}>
        <OpenAiKeyEntry
          onDone={() => {
            setStep("welcome");
          }}
        />
      </div>
    );
  } else if (step === "welcome") {
    body = (
      <Welcome isPopup={isPopup} onStart={handleStart} onSkip={handleSkip} />
    );
  } else {
    body = (
      <Inner
        isPopup={isPopup}
        onNewJob={handleNew}
        onShowSettings={() => setStep("settings")}
      />
    );
  }
  return (
    <div style={{ minHeight: 560 }}>
      <HelpBar />
      <GlobalError />
      {/*<div style={{ color: 'white' }}>STEP:{step}</div>*/}
      {body}
    </div>
  );
};
