import { useCallback, useEffect, useRef, useState } from "react";
import { useLocal } from "../../state/storage";
import Textarea from "react-expanding-textarea";
import { runGather } from "../../lib/job";
import { getActiveTab } from "../../lib/navigation";
import { addUrlsToJob, setJobField } from "../../lib/store";
import { Error } from "../common/Error";
import { Pills } from "../common/Pills";
import { Pagination } from "../pagination/Pagination";
import { PerPage } from "../perpage/PerPage";
import { stepHeaderStyle, stepStyle, maybeOpenPanel } from "./shared";

export const UrlsStep = ({ job, isPopup }) => {
  const [action, setAction] = useState(null);
  const [url, _setUrl] = useState(null);
  const [list, setList] = useState([]);
  const [question, setQuestion] = useState(null);
  const [shouldClear, setShouldClear] = useState(false);
  const [manualUrls, setManualUrls] = useState("");
  const [manualError, setManualError] = useState();
  const [showCurrentButton, setShowCurrentButton] = useState(false);
  const [tab, setTab] = useState("gather");
  const [currentUrl, setCurrentUrl] = useState("");
  const [pagination, setPagination] = useState();
  const [perPage, setPerPage] = useState();
  const [error, setError] = useState();
  const [step, setStep] = useLocal('step');

  const setUrl = useCallback(
    (val) => {
      console.log("!!! setUrl called", val);
      _setUrl(val);
    },
    [_setUrl]
  );

  useEffect(() => {
    if (!job) return;

    const update = async () => {
      if (step != 'inner') return;

      console.log("ready updating current tab");
      const tab = await getActiveTab();
      console.log("ready current tab:", tab.url);
      updateUrl(tab.url);
      setCurrentUrl(tab.url);
    };

    update();

    const on = chrome.webNavigation.onHistoryStateUpdated;
    on.addListener(update);
    return () => on.removeListener(update);
  }, [job]);

  useEffect(() => {
    setError(null);
    console.log("mmm currentUrl", currentUrl);
    if (currentUrl.indexOf("https://chromewebstore.google.com") !== -1) {
      setError("Due to Google policy, cannot scrape Chrome Extension Store");
    }
  }, [currentUrl]);

  useEffect(() => {
    getActiveTab().then((activeTab) => {
      setCurrentUrl(activeTab.url);
      setTab(action);

      if (action === "gather") {
        const exists = !(url || "").split("\n").includes(activeTab.url);
        // console.log("gather, exists =", exists);
        setShowCurrentButton(exists);
      } else if (action === "manual") {
        const exists = !(manualUrls || "").split("\n").includes(activeTab.url);
        setShowCurrentButton(exists);
      }
    });
  }, [url, action, manualUrls]);

  const updateTabAndAction = async (t) => {
    setTab(t);
    await updateAction(t);
    if (t == 'current') {
      await updatePerPage('multiple');
      await updateConcurrency(-1);
    } else {
      await updatePerPage('guess');
      await updateConcurrency(3);
    }
  };

  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults === 0 ? 1 : 2;

  const timeoutRef = useRef(null);
  const updateJob = async (field, val, setter, hack) => {
    if (!hack) hack = 'urls';
    setter(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const updated = JSON.parse(JSON.stringify(job[hack]));
    updated[field] = val;
    return new Promise((ok) => {
      timeoutRef.current = setTimeout(
        async () => {
          await setJobField(job.id, hack, updated);
          ok();
        },
        100);
    });
  }

  const updateConcurrency = async (val) => {
    console.log('update conc', val);
    return updateJob('concurrency', val, () => {}, 'scrape');
  }
  const updateAction = async (val) => updateJob("action", val, setAction);
  const updateUrl = async (val) => updateJob("url", val, setUrl);
  const updateManualUrls = async (val) => updateJob("manualUrls", val, setManualUrls);
  const updateList = async (val) => updateJob("list", val, setList);
  const updateQuestion = async (val) => updateJob("question", val, setQuestion);
  const updateShouldClear = async (val) => updateJob("shouldClear", val, setShouldClear);
  const updatePagination = async (val) => updateJob("pagination", val, setPagination);
  const updatePerPage = async (val) => updateJob("perPage", val, setPerPage);

  const cleanManualUrls = (x) => {
    x
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => !!x && x !== "");
  }

  const checkManualUrls = (val, skipShort) => {
    setManualError();
    for (const url of cleanManualUrls(val)) {
      if (skipShort && url.length < 8) continue;
      if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
        setManualError("URLs must start with http:// or https://");
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!job) return;

    console.log("use effect updating from", job);

    updateAction(job.urls?.action);
    updateUrl(job.urls?.url);
    updateManualUrls(job.urls?.manualUrls);
    updatePagination(job.urls?.pagination);
    updatePerPage(job.urls?.perPage);
    updateList(job.urls?.list);
    updateQuestion(job.urls?.question);
    updateShouldClear(!!job.urls?.shouldClear);
  }, [job?.id]);

  if (!job) return null;

  const handleCurrent = async () => {
    const activeTab = await getActiveTab();
    if (activeTab) {
      if (action === "gather") {
        // updateUrl(activeTab.url + '\n' + url);
        updateUrl(activeTab.url);
      } else if (action === "manual") {
        // updateManualUrls(activeTab.url + '\n' + manualUrls);
        updateManualUrls(activeTab.url);
      }
    }
  };

  const handleClick = async () => {
    if (!job) return;

    const activeTab = await getActiveTab();

    if (isPopup) {
      await maybeOpenPanel(job);
    }

    if (action === "gather") {
      runGather(job);
      if (job.urls.shouldClear) {
        updateShouldClear(false);
      }
    } else if (action === "manual") {
      if (!checkManualUrls(manualUrls, false)) return;
      const add = cleanManualUrls(manualUrls);
      console.log("add these urls manually:", add);
      addUrlsToJob(job.id, add);
      setManualUrls("");
    }
  };

  const perPageNode = <PerPage perPage={perPage} onChange={updatePerPage} />;

  const questionNode = (
    <div>
      <p>
        What kinds of {action === "gather" ? "links" : "items"} should we look
        for?
      </p>
      <Textarea
        style={{
          width: "100%",
          fontFamily: "sans-serif",
          resize: "none",
          padding: "4px 8px",
          border: 0,
          borderRadius: 2,
        }}
        placeholder="Look for links to product pages"
        value={question}
        onChange={(e) => updateQuestion(e.target.value)}
      />
    </div>
  );

  const currentButtonNode = (
    <div
      style={{ position: "absolute", right: 3, top: 7, background: "white" }}
    >
      <button
        className="btn btn-gray"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 8px",
          color: "white",
        }}
        onClick={handleCurrent}
      >
        Current
      </button>
    </div>
  );

  const gatherNode = (
    <div>
      <p>Find links on current page</p>
      <div style={{ position: "relative" }}>
        {/*
        {showCurrentButton && currentButtonNode}
        <input
          style={{ width: '100%',
                   fontFamily: 'sans-serif',
                   resize: 'none',
                   padding: '8px',
                   border: 0,
                   borderRadius: 4,
                 }}
          placeholder={'https://example.com/category/page/1\nhttps://example.com/category/page/2\n...'}
          value={url}
          onChange={(e) => updateUrl(e.target.value)}
          type="text"
        />
        */}

        <div
          style={{
            background: "#fff3",
            padding: "8px",
            margin: "10px 0",
            borderRadius: 4,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {url}
        </div>
      </div>

      {questionNode}
      {perPageNode}

      <div style={{ marginTop: 10 }}>
        <button
          className={"btn btn-gray btn-md"}
          style={{ width: "100%" }}
          onClick={handleClick}
        >
          Run Only Crawl
        </button>
      </div>
    </div>
  );

  const currentNode = (
    <div>
      <p>We will only scrape the current page</p>
      <div style={{ position: "relative" }}>
        <div
          style={{
            background: "#fff3",
            padding: "8px",
            margin: "10px 0",
            borderRadius: 4,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {currentUrl}
        </div>
      </div>

      <Pagination
        url={currentUrl}
        onChange={updatePagination}
        follow={job?.urls?.pagination?.follow || false}
        count={job?.urls?.pagination?.count || 0}
      />

      {/*<pre>{JSON.stringify(job?.urls?.pagination, null, 2)}</pre>*/}

      {questionNode}
      {perPageNode}
    </div>
  );

  const manualNode = (
    <div>
      <p>Enter the URLs you would like to scrape (one per row)</p>
      <div style={{ position: "relative" }}>
        <textarea
          style={{
            width: "100%",
            minHeight: 80,
            fontFamily: "sans-serif",
            padding: "8px",
            border: 0,
            borderRadius: 4,
            marginBottom: 2,
          }}
          className={manualError ? "error" : ""}
          placeholder={`https://www.example.com/page-1
https://www.example.com/page-2
...`}
          onChange={(e) => updateManualUrls(e.target.value)}
          value={manualUrls}
        />
      </div>
      <Error message={manualError} />
      {questionNode}
      {perPageNode}
    </div>
  );

  return (
    <div style={stepStyle}>
      <div style={stepHeaderStyle}>What page do you want to scrape?</div>

      <Pills value={tab} onChange={updateTabAndAction}>
        <div key="current">Current Page Only</div>
        <div key="gather">Linked Pages</div>
        <div key="manual">Manually Enter URLs</div>
      </Pills>

      {action === "current" && currentNode}
      {action === "gather" && gatherNode}
      {action === "manual" && manualNode}

      <Error message={error} />
    </div>
  );
};
