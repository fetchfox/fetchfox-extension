import fox from "data-base64:~assets/fox-transparent.png";
import { useEffect, useState } from "react";
import { useLocal } from "../../state/storage";
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
  const { job } = useActiveJob();

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
  const [ai, setAi] = useState({ ok: false, didInit: false });
  const [activeTab, setActiveTab] = useState({ tab: null, didInit: false });
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useLocal('step');
  const [ready, setReady] = useState(false);
  const quota = useQuota();
  const activeJob = useActiveJob();

  useEffect(() => {
    getActiveTab().then((tab) => {
      setActiveTab({ tab, didInit: true });
    });
  }, []);

  useEffect(() => {
    // Flow:
    // - If loading, not ready
    // - If plan is 'openai', ready when key is set
    // - If plan is 'free', ready

    if (loadingOpenAiKey) return;
    if (openAiPlan == 'openai') {
      setAi({ ok: quota.ok, didInit: true });
    } else if (openAiPlan == 'free') {
      setAi({ ok: true, didInit: true });
    } else {
      setAi({ ok: false, didInit: true });
    }
  }, [loadingOpenAiKey, openAiKey, openAiPlan, quota?.ok]);

  useEffect(() => {
    // Flow:
    // - Wait for everything to initialize
    // - If AI config is not ready, show settings screen
    // - Else, wait for active job
    // - If no active job, show 'welcome'
    // - If active job, and same domain, show 'inner'
    // - Else, show 'welcome'

    if (ready) return;
    if (!ai.didInit) return;
    if (!activeTab.didInit) return;
    if (!activeJob.didInit) return;

    console.log('get ready with:', ai);
    console.log('get ready with:', activeTab);
    console.log('get ready with:', activeJob);

    if (!ai.ok) {
      setStep('settings');
      setReady(true);
      return;
    }

    if (!activeJob.job) {
      setStep('welcome');
      setReady(true);
      return;
    }

    getKey("inFlight")
      .then((inFlight) => {
        const jobUrl = getJobUrl(activeJob.job) || "";
        const tabUrl = activeTab ? activeTab.tab.url : "";
        const tabHostname = tabUrl ? new URL(tabUrl).hostname : "";

        console.log('got inFlight to get ready:', inFlight);
        console.log('got jobUrl to get ready:', jobUrl);
        console.log('got tabUrl to get ready:', tabUrl);
        console.log('got tabHostname to get ready:', tabHostname);

        if (inFlight > 0) {
          // Job is running, go to inner page
          setStep('inner');
          setReady(true);
        } else if (jobUrl && jobUrl.indexOf(tabHostname) === -1) {
          // New domain, assume new job
          console.log("ready new domain, so change the step");
          setStep("welcome");
          setReady(true);
        } else {
          setStep("inner");
          setReady(true);
        }
      });

  }, [
    ai.didInit,
    activeTab.didInit,
    activeJob.didInit,
  ]);

  const handleSkip = async () => {
    if (!activeJob.job) {
      handleStart(await genBlankJob());
    } else {
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

  let msg = (
    <div style={{ color: 'white' }}>
      <ul>
        <li>loadingOpenAiKey: {''+loadingOpenAiKey}</li>
        <li>openAiKey: {''+openAiKey}</li>
        <li>openAiPlan: {''+openAiPlan}</li>
        <li>quota?.ok: {''+quota?.ok}</li>
      </ul>

      STEP:{step}<br/>
      AI READY?{JSON.stringify(ai)}<br/>
      READY?{''+ready}<br/>
      loadingOpenAiKey:{loadingOpenAiKey}
    </div>
  );

  let body;

  if (!ready) {
    body = (
      <div style={{ padding: 50, textAlign: "center", color: "white" }}>
        <Loading size={50} />
      </div>
    );
  } else {
    switch (step) {
      case 'settings':
        body = (
          <div style={mainStyle}>
            <OpenAiKeyEntry onDone={() => setStep("welcome")} />
          </div>
        );
        break;

      case 'welcome':
        body = (
          <Welcome
            isPopup={isPopup}
            onStart={handleStart}
            onSkip={handleSkip} />
        );
        break;

      case 'inner':
        body = (
          <Inner
            isPopup={isPopup}
            onNewJob={handleNew}
            onShowSettings={() => setStep("settings")}
          />
        );
        break;

      default:
        body = <div>Unhandled step, please report issue</div>;
    }
  }

  return (
    <div style={{ minHeight: 560 }}>
      <HelpBar />
      <GlobalError />
      {/*msg*/}
      {body}
    </div>
  );
};
