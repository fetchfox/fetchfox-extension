import { useEffect, useRef, useState } from "react";
import { useLocal } from "../../state/storage";
import Textarea from "react-expanding-textarea";
import { MdEditSquare } from "react-icons/md";
import { setGlobalError } from "../../lib/errors";
import { genJob, genJobFromUrls } from "../../lib/gen";
import { getActiveTab, getTabData } from "../../lib/navigation";
import { getKey, setKey } from "../../lib/store";
import { useJobs } from "../../state/jobs";
import { Loading } from "../common/Loading";
import { FoxSays } from "../fox/FoxSays";
import { InputPrompt } from "../prompt/InputPrompt";
import { mainStyle, openPanel } from "./shared";

export const Welcome = ({ isPopup, onStart, onSkip }) => {
  const [prompt, setPrompt] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState();
  const [manual, setManual] = useState();
  const [manualUrls, setManualUrls] = useState("");
  const [disabled, setDisabled] = useState();
  const [step, setStep] = useLocal('step');
  const jobs = useJobs();

  useEffect(() => {
    getActiveTab().then((tab) => setUrl(tab.url));
    getKey("masterPrompt").then((val) => setPrompt(val || ""));
  }, []);

  useEffect(() => {
    setDisabled(manual && !manualUrls.trim());
  }, [manual, manualUrls]);

  const examples = [
    [
      "Find comment pages, get main topic, and tone in 1-3 words",
      "https://news.ycombinator.com/",
    ],
    [
      "Find number of bedrooms, bathrooms, 2-5 word summary",
      "https://sfbay.craigslist.org/search/apa#search=1~list~0~0",
    ],
    [
      "Find articles, get title, author, date, key people, company",
      "https://techcrunch.com/",
    ],
  ];

  const exampleStyle = {
    cursor: "pointer",
    background: "#0006",
    color: "#bbb",
    padding: 10,
    borderRadius: 10,
    flexBasis: "100%",
  };

  const jobStyle = {
    cursor: "pointer",
    background: "#0006",
    color: "#bbb",
    padding: 10,
    borderRadius: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const instructionStyle = {
    textAlign: "center",
    marginTop: jobs.length === 0 ? 40 : 20,
  };

  const handleExample = async (e, prompt, url) => {
    setPrompt(prompt);
    setUrl(url);
    await handleSubmit(e, prompt, url);
    await setStep('inner');
    const activeTab = await getActiveTab();
    chrome.tabs.update(activeTab.id, { url });
    if (isPopup) openPanel();
  };

  let i = 0;
  const exampleNodes = examples.map(([prompt, url]) => {
    return (
      <div
        style={exampleStyle}
        onClick={(e) => handleExample(e, prompt, url)}
        key={i++}
      >
        <div style={{ whiteSpace: "nowrap", marginBottom: 4 }}>
          <b>{new URL(url).hostname}</b>
        </div>
        {prompt}
      </div>
    );
  });

  const jobNodes = jobs
    .filter((j) => j && j.name && !j.name.startsWith("Untitled"))
    .slice(0, 4)
    .map((j) => {
      return (
        <div style={jobStyle} onClick={() => onStart(j)}>
          {j.name}
        </div>
      );
    });

  const loadingNode = (
    <div
      style={{
        position: "absolute",
        width: "100%",
        textAlign: "center",
        bottom: 0,
      }}
    >
      <Loading width={24} />
    </div>
  );

  const handleSubmit = async (e, prompt, url, isActive) => {
    e.preventDefault();
    setLoading(true);

    try {
      const useUrl = isActive ? (await getActiveTab()).url : url;
      let job;
      if (manual) {
        job = await genJobFromUrls(prompt, manualUrls.split("\n"));
      } else {
        const page = isActive ? await getTabData() : null;
        if (page?.error) {
          setGlobalError(page?.error);
          return;
        }
        job = await genJob(prompt, useUrl, page);
      }
      console.log("==== GEN JOB DONE ====");
      console.log("mmm genjob gave 2:", job);
      return onStart(job);
    } catch (e) {
      console.log("mmm caught error in generate job:", e);
      setGlobalError("Error generating job, try again: " + e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const timeoutRef = useRef(null);
  const updatePrompt = (e) => {
    console.log("updatePrompt", e.target.value);
    setPrompt(e.target.value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => setKey("masterPrompt", e.target.value),
      100
    );
  };

  const inputNode = (
    <InputPrompt
      onSubmit={(e) => handleSubmit(e, prompt, url, true)}
      onChange={updatePrompt}
      prompt={prompt}
      loading={loading}
      disabled={disabled}
    />
  );

  const prevNode = (
    <div>
      <div style={instructionStyle}>Previous scrapes</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 5,
          marginTop: 10,
        }}
      >
        {jobNodes}
      </div>
    </div>
  );

  let urlNode;
  if (manual) {
    urlNode = (
      <div style={{ color: "#bbb" }}>
        <div>Scrape these URLs (one per line)</div>
        <Textarea
          style={{
            width: "100%",
            fontFamily: "sans-serif",
            fontSize: 14,
            margin: "5px 0",
            padding: 8,
            paddingLeft: 12,
            paddingRight: 36,
            border: 0,
            borderRadius: 8,
            minHeight: 60,
            maxHeight: 120,
          }}
          value={manualUrls}
          onChange={(e) => setManualUrls(e.target.value)}
        />
      </div>
    );
  } else {
    urlNode = (
      <div
        style={{ display: "flex", alignItems: "center", gap: 5, color: "#bbb" }}
      >
        <div>
          Scrape <b style={{ color: "#fff" }}>{url}</b>
        </div>
        <MdEditSquare
          style={{ cursor: "pointer" }}
          onClick={() => {
            setManual(true);
            setManualUrls(url);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...mainStyle, paddingBottom: 10, paddingTop: 40 }}>
      <FoxSays message="Hi! I'm FetchFox" />

      <div style={instructionStyle}>Try these examples</div>
      <div style={{ display: "flex", width: "100%", gap: 10, marginTop: 10 }}>
        {exampleNodes}
      </div>

      {jobNodes.length > 0 && prevNode}

      <div style={instructionStyle}>Create your own scrape</div>
      <div
        style={{
          marginTop: 10,
          background: "#fff2",
          padding: 10,
          borderRadius: 10,
        }}
      >
        {urlNode}
        <div style={{ position: "relative" }}>
          {/*loading && loadingNode*/}
          {inputNode}
        </div>
      </div>

      <div style={{ ...instructionStyle, marginBottom: 40 }}>
        Know what you're doing?{" "}
        <span className="clickable" onClick={onSkip}>
          Go to Editor &raquo;
        </span>
      </div>
    </div>
  );
};
