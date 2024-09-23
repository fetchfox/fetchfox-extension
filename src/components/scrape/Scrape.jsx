import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiEdit2 } from 'react-icons/fi';
import Textarea from 'react-expanding-textarea';
import {
  IoMdSettings,
  IoMdAddCircle,
  IoMdCloseCircle,
  IoMdArrowBack,
} from 'react-icons/io';
import { IoPlayCircle, IoCloseCircle } from 'react-icons/io5';
import {
  TbLayoutBottombarExpandFilled,
  TbLayoutBottombarCollapseFilled,
  TbFileArrowRight,
} from 'react-icons/tb';
import { TiDelete } from 'react-icons/ti';
import { HiMiniPencilSquare } from 'react-icons/hi2';
import {
  FaCircleStop,
  FaFileCsv,
  FaShareFromSquare,
  FaCircleMinus,
  FaPencil,
} from 'react-icons/fa6';
import {
  FaPlus,
  FaArrowRight,
} from 'react-icons/fa';
import {
  FiPlus,
  FiMinus,
  FiMinusCircle,
} from 'react-icons/fi';
import { HiArrowsExpand } from 'react-icons/hi';
import { runJob, runGather, runScrape, sendStopMessage } from '../../lib/job.mjs';
import { genJob, genBlankJob, genJobFromUrls } from '../../lib/gen.mjs';
import { formatNumber, getJobColumn } from '../../lib/util.mjs';
import { getActiveTab, getTabData } from '../../lib/navigation.mjs';
import { setGlobalError } from '../../lib/errors.mjs';
import {
  getKey,
  setKey,
  setActiveJob,
  saveJob,
  setJobField,
  getJob,
  setStatus,
  addUrlsToJob,
  removeUrlsFromJob,
  setJobResults,
  clearJobResults,
  setScrapeStatus,
} from '../../lib/store.mjs';
import { useRoundId, advanceRound, getRoundId } from '../../lib/controller.mjs';
import { bgColor, mainColor } from  '../../lib/constants.mjs';
import { downloadJobCsv } from '../../lib/csv.mjs';
import {
  useJobs,
  useJob,
  useActiveJob,
} from '../../state/jobs';
import { useAutoSleepTime } from '../../state/util';
import { useOpenAiKey, useUsage } from '../../state/openai';
import { Loading } from '../common/Loading';
import { Checkbox } from '../common/Checkbox';
import { Pills } from '../common/Pills';
import { Error } from '../common/Error';
import { HelpBar } from '../common/HelpBar';
import { GlobalError } from '../common/GlobalError';
import { OpenAiKeyEntry } from '../openai/OpenAiKeyEntry';
import { Share } from '../share/Share';
import { FoxSays } from '../fox/FoxSays';
import fox from '../../assets/img/fox-transparent.png';
import './Scrape.css';

const blankJob = {
  id: 'draft',
  urls: {
    action: 'gather',
    url: '',
    question: '',
    list: [],
  },
  scrape: {
    action: 'scrape',
    questions: [''],
  },
};

const mainStyle = {
  padding: 10,
  paddingBottom: 100,
  color: 'white',
  width: '100%',
};

const stepStyle = {
  borderRadius: 5,
  padding: 10,
  background: '#fff2',
  marginBottom: 20,
};

const stepHeaderStyle = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
};

const smallButtonStyle = {
  fontSize: 12,
}

const maybeOpenPanel = async (job) => {
  if (!(job.scrape?.concurrency < 0)) return;
  if (job.urls?.action == 'current') return;
  return openPanel();
}

const openPanel = async () => {
  const activeTab = await getActiveTab();
  chrome.sidePanel.open(
    { windowId: activeTab.windowId },
    () => {
      // TODO: remove need for setTimeout
      setTimeout(
        () => { window.close() },
        50);
    });
}

const StatusBar = ({ onRun }) => {
  const [message, setMessage] = useState('');
  const [percent, setPercent] = useState();
  const [completion, setCompletion] = useState();
  const [tpm, setTpm] = useState();
  const [inFlight, setInFlight] = useState(0);
  const [loading, setLoading] = useState();
  const [statusHeight, setStatusHeight] = useState(0);
  const roundId = useRoundId(0);
  const usage = useUsage();

  console.log('Status bar usage:', usage);

  useEffect(() => {
    chrome.storage.local.get()
      .then(st => {
        if (st.status) setMessage(st.status.message);
        if (st.percent) setPercent(st.percent);
        if (st.completion) setCompletion(st.completion);
        if (st.tpm) setTpm(st.tpm);
        if (st.inFlight) setInFlight(st.inFlight);
      });
  }, []);

  useEffect(() => {
    const handle = (changes, area) => {
      if (changes.status) setMessage(changes.status.newValue.message);
      if (changes.percent) setPercent(changes.percent.newValue);
      if (changes.completion) setCompletion(changes.completion.newValue);
      if (changes.tpm) setTpm(changes.tpm.newValue);
      if (changes.inFlight) setInFlight(changes.inFlight.newValue);
    };

    chrome.storage.onChanged.addListener(handle);
    return () => chrome.storage.onChanged.removeListener(handle);
  });

  const handleRun = () => {
    onRun();
  };

  const size = 28

  const buttonNode = (
    <div>
      <button
        className={'btn btn-lg btn-primary'}
        style={{ width: '100%' }}
        onClick={() => handleRun()}
        >
        Run Scrape
      </button>
    </div>
  );

  const busy = loading || inFlight != 0;
  // const busy = true;

  const calcWidth = 'calc(100% - ' + (2 * size + 16) + 'px)';

  const loadingNode = (
    <div style={{ height: size + 20,
                  padding: '2px 0',
                  display: 'flex',
                  gap: 5,
                  alignItems: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
      >
      <div style={{ width: size + 2, paddingLeft: 2, textAlign: 'right' }}>
        {busy ? <Loading width={size} /> : null}
      </div>

      {busy && <div style={{ width: size }}>
        <a
          style={{ color: 'white' }}
          href="#"
          onClick={(e) => { e.preventDefault(); advanceRound(); sendStopMessage() }}
          >
          <FaCircleStop size={size} />
        </a>
      </div>}

      {busy && percent && <div style={{ width: calcWidth,
                                        height: 18,
                                        bottom: 10,
                                        position: 'absolute',
                                        marginLeft: size * 2 + 16,
                                        background: '#fff3',
                                        borderRadius: 4,
                  }}>
        <div style={{ width: Math.floor(100 * percent) + '%',
                      height: 18,
                      background: mainColor,
                      borderRadius: 4,
                    }}>
        </div>
      </div>}

      <div style={{ position: 'absolute',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: calcWidth,
                    marginLeft: size * 2 + 16,
                    fontSize: 10,
                    top: 6,
                  }}>
        <div>
          {percent && (Math.round(100*percent) + '%')}
          {percent && !!completion?.done && !!completion?.total &&
            <span> ({completion.done}/{completion.total})</span>
           }
        </div>
        <div>
          {tpm && <span> {formatNumber(tpm, true)} tpm, {formatNumber(usage.total || 0, true)}</span>}
        </div>
      </div>

      <div style={{ whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    zIndex: 2,
                    width: 'calc(100% - 10px)',
                    paddingRight: 30,
                    marginLeft: 8,
                    marginTop: 8,
                  }}>
        {inFlight > 0 ? (' ' + message) : ''}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%',
                  position: 'fixed',
                  background: bgColor,
                  left: 0,
                  bottom: 0,
                  padding: 10,
                  height: 74,
                }}>

      <div style={{ marginBottom: 20 }}>
        {!busy && buttonNode}
        {busy && loadingNode}
      </div>
    </div>
  );
}

const UrlsStep = ({ job, isPopup }) => {
  const [action, setAction] = useState(null);
  const [url, setUrl] = useState(null);
  const [list, setList] = useState([]);
  const [question, setQuestion] = useState(null);
  const [shouldClear, setShouldClear] = useState(false);
  const [manualUrls, setManualUrls] = useState('');
  const [manualError, setManualError] = useState();
  const [showCurrentButton, setShowCurrentButton] = useState(false);
  const [tab, setTab] = useState('gather');
  const [currentUrl, setCurrentUrl] = useState('');

  const timeoutRef = useRef(null);


  useEffect(() => {
    const update = () => {
      getActiveTab().then(a => {
        updateUrl(a.url);
        setCurrentUrl(a.url);
      });
    };

    update();

    const on = chrome.webNavigation.onHistoryStateUpdated;
    on.addListener(update);
    return () => on.removeListener(update);
  }, []);

  useEffect(() => {
    getActiveTab()
      .then((activeTab) => {
        setCurrentUrl(activeTab.url);
        setTab(action);

        if (action == 'gather') {
          const exists = !((url || '').split('\n').includes(activeTab.url));
          setShowCurrentButton(exists);
        } else if (action == 'manual') {
          const exists = !((manualUrls || '').split('\n').includes(activeTab.url));
          setShowCurrentButton(exists);
        }
      });
  }, [url, action, manualUrls]);

  const updateTabAndAction = (t) => {
    setTab(t);
    updateAction(t);
  }

  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults == 0 ? 1 : 2;

  const updateJob = (field, val, setter) => {
    setter(val);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const updated = JSON.parse(JSON.stringify(job.urls));
    updated[field] = val;
    timeoutRef.current = setTimeout(
      () => setJobField(job.id, 'urls', updated),
      100);
  };

  const updateAction = (val) => updateJob('action', val, setAction);
  const updateUrl = (val) => updateJob('url', val, setUrl);
  const updateManualUrls = (val) => updateJob('manualUrls', val, setManualUrls);
  const updateList = (val) => updateJob('list', val, setList);
  const updateQuestion = (val) => updateJob('question', val, setQuestion);
  const updateShouldClear = (val) => updateJob('shouldClear', val, setShouldClear);

  const cleanManualUrls = (x) => x
    .split('\n')
    .map(x => x.trim())
    .filter(x => !!x && x != '');

  const checkManualUrls = (val, skipShort) => {
    setManualError();
    for (const url of cleanManualUrls(val)) {
      if (skipShort && url.length < 8) continue;
      if (url.indexOf('http://') != 0 && url.indexOf('https://') != 0) {
        setManualError('URLs must start with http:// or https://');
        return false;
      }
    }
    return true;
  }

  useEffect(() => {
    if (!job) return;

    console.log('use effect updating from', job);

    updateAction(job.urls?.action);
    updateUrl(job.urls?.url);
    updateManualUrls(job.urls?.manualUrls);
    updateList(job.urls?.list);
    updateQuestion(job.urls?.question);
    updateShouldClear(!!(job.urls?.shouldClear));
  }, [job?.id]);

  if (!job) return null;

  const handleCurrent = async () => {
    const activeTab = await getActiveTab();
    if (activeTab) {
      if (action == 'gather') {
        // updateUrl(activeTab.url + '\n' + url);
        updateUrl(activeTab.url);
      } else if (action == 'manual') {
        // updateManualUrls(activeTab.url + '\n' + manualUrls);
        updateManualUrls(activeTab.url);
      }
    }
  }

  const handleClick = async () => {
    const activeTab = await getActiveTab();

    if (isPopup) {
      await maybeOpenPanel(job);
    }

    if (action == 'gather') {
      runGather(job);
      if (job.urls.shouldClear) {
        updateShouldClear(false);
      }

    } else if (action == 'manual') {
      if (!checkManualUrls(manualUrls, false)) return;
      const add = cleanManualUrls(manualUrls);
      console.log('add these urls manually:', add);
      addUrlsToJob(job.id, add);
      setManualUrls('');
    }
  }

  const questionNode = (
    <div>
      <p>What kinds of {action == 'gather' ? 'links' : 'items' } should we look for?</p>
      <Textarea
        style={{ width: '100%',
                 fontFamily: 'sans-serif',
                 resize: 'none',
                 padding: '4px 8px',
                 border: 0,
                 borderRadius: 2,
               }}
        placeholder="Look for links to product pages"
        value={question}
        onChange={(e) => updateQuestion(e.target.value)} />
    </div>
  );

  const currentButtonNode = (
    <div style={{ position: 'absolute', right: 3, top: 7, background: 'white', }}>
      <button
        className="btn btn-gray"
        style={{ display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 padding: '2px 8px',
                 color: 'white',
               }}
        onClick={handleCurrent}
        >
        Current
      </button>
    </div>
  )

  const gatherNode = (
    <div>
      <p>Find links on current page</p>
      <div style={{ position: 'relative' }}>

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

        <div style={{ background: '#fff3',
                      padding: '8px',
                      margin: '10px 0',
                      borderRadius: 4,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
          {url}
        </div>

      </div>

      {questionNode}

      <div style={{ marginTop: 10 }}>
        <button
          className={'btn btn-gray btn-md'}
          style={{ width: '100%' }}
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
      <div style={{ position: 'relative' }}>
        <div style={{ background: '#fff3',
                      padding: '8px',
                      margin: '10px 0',
                      borderRadius: 4,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
          {currentUrl}
        </div>
      </div>
      {questionNode}
    </div>
  );

  const manualNode = (
    <div>
      <p>Enter the URLs you would like to scrape (one per row)</p>
      <div style={{ position: 'relative' }}>
        <textarea
          style={{ width: '100%',
                   minHeight: 80,
                   fontFamily: 'sans-serif',
                   padding: '8px',
                   border: 0,
                   borderRadius: 4,
                   marginBottom: 2,
                 }}
          className={manualError ? 'error' : ''}
          placeholder={`https://www.example.com/page-1
https://www.example.com/page-2
...`}
          onChange={(e) => updateManualUrls(e.target.value)}
          value={manualUrls}
        />
      </div>

      {questionNode}
      <Error message={manualError} />
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

      {action == 'current' && currentNode}
      {action == 'gather' && gatherNode}
      {action == 'manual' && manualNode}
    </div>
  );
};

const ScrapeStep = ({ job, isPopup, onChange, onClick }) => {
  const [questions, setQuestions] = useState(['']);
  const [concurrency, setConcurrency] = useState();
  const [sleepTime, setSleepTime] = useState();

  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults == 0 ? 1 : 2;
  const autoSleepTime = useAutoSleepTime();

  console.log('autoSleepTime', autoSleepTime);

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!job?.scrape) return;
    setQuestions(job.scrape?.questions || ['']);
    setConcurrency(job.scrape?.concurrency || 3);
    setSleepTime(job.scrape?.sleepTime || 'auto');
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
    for (const target of (job?.results?.targets || [])) {
      hasScraped = target.status == 'scraped';
      if (hasScraped) break;
    }

    hasScraped = true;

    timeoutRef.current = setTimeout(
      async () => {
        if (hasScraped) {
          await setJobField(job.id, 'scrape', updated);
          if (field == 'questions') {
            setScrapeStatus(
              job.id,
              await getRoundId(),
              (job.results?.targets || []).map(t => t.url),
              'found');
          }
        } else {
          setJobField(job.id, 'scrape', updated);
        }
      },
      200);
  };

  const updateConcurrency = (val) => updateJob('concurrency', val, setConcurrency);
  const updateSleepTime = (val) => updateJob('sleepTime', val, setSleepTime);

  const updateQuestion = async (index, val) => {
    const q = JSON.parse(JSON.stringify(questions));
    q[index] = val;
    updateJob('questions', q, setQuestions);
  };

  const removeQuestion = (index) => {
    const q = JSON.parse(JSON.stringify(questions));
    q.splice(index, 1);
    updateJob('questions', q, setQuestions);
  }

  const addQuestion = () => {
    const q = JSON.parse(JSON.stringify(questions));
    q.push('');
    updateJob('questions', q, setQuestions);
  }

  let i = 0;
  const nodes = questions.map(q => {
    const index = i++;
    return (
      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: '100%' }}>
          <input
            style={{ width: '100%', marginBottom: 5 }}
            placeholder={'eg: "What is the star rating of this product?"'}
            value={q}
            onChange={(e) => updateQuestion(index, e.target.value)}
          />
        </div>
        <div>
          <IoMdCloseCircle
            style={{ cursor: 'pointer', opacity: .8 }}
            size={16}
            onClick={() => removeQuestion(index)}
          />
        </div>
      </div>
    );
  });

  const controlsNode = (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
      <div style={{ width: '60%' }}>
        <p>Max tabs at once. Reduce if you hit rate limits.</p>
        <select
          style={{ width: '100%' }}
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
            <option value={50}>50 (warp speed! you're gonna see some captchas)</option>
          </optgroup>
        </select>
      </div>

      <div style={{ width: '40%' }}>
        <p>Wait time before extraction</p>
        <select
          style={{ width: '100%' }}
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
      .filter(t => t.status != 'scraped')
      .map(t => t.url);

    if (urls.length == 0) {
      urls = job.results.targets
        .map(t => t.url);
    }

    if (isPopup) {
      await maybeOpenPanel(job);
    }

    return runScrape(job, urls);
  }

  return (
    <div style={stepStyle}>
      <div style={stepHeaderStyle}>What do you want to scrape on {job.urls?.action == 'current' ? 'this' : 'each'} page?</div>
      {nodes}

      <div
        className="btn btn-gray"
        style={{ display: 'flex', alignItems: 'center', width: 92, justifyContent: 'center'}}
        onClick={() => addQuestion()}
        >
        <FiPlus size={14} />&nbsp;Add Field
      </div>

      {job.urls?.action == 'gather' && controlsNode}

      {job.urls.action == 'gather' && <div style={{ marginTop: 10 }}>
        <button
          className={'btn btn-gray btn-md'}
          style={{ width: '100%' }}
          disabled={currentStep < 2}
          onClick={handleClick}
          >
          Run Only Extraction
        </button>
      </div>}
    </div>
  );
}

const Results = ({
  job,
  targets,
  onScrape,
  onRemove,
  onNewJobFromUrls }) =>
{

  const [highlight, setHighlight] = useState();

  const headers = (job?.results?.answerHeaders || []);
  const types = (job?.results?.types || {});

  const urlStyle = {
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  };

  const answerStyle = {
    minWidth: 120,
    maxWidth: 400,
    overflowWrap: 'break-word',
  };

  const highlightStyle = {
    backgroundColor: '#fff1',
  };

  const handleNewScrape = (header) => {
    if (!confirm('Start a new scrape using column "' + header + '"?')) return;
    onNewJobFromUrls(getJobColumn(job, header));
  }

  const newScrapeNode = (header) => {
    return (
      <div style={{ whiteSpace: 'nowrap', margin: '4px 0' }}>
        <button
          onMouseEnter={() => setHighlight(header)}
          onMouseLeave={() => setHighlight(null)}
          onClick={() => handleNewScrape(header)}
          className="btn btn-gray"
          >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5}}>
            New Scrape <TbFileArrowRight size={14} />
          </div>
        </button>
      </div>
    )
  }

  let i = 0;
  let headerNodes = [];
  headerNodes.push(<th key="action"></th>);
  headerNodes.push(<th key="status" style={{ maxWidth: 80 }}>status</th>);
  headerNodes.push(
    <th key="url" style={urlStyle}>
      URL
      {/*targets && targets.length > 0 && newScrapeNode('URL')*/}
    </th>);

  // headerNodes.push(<th key="text">Link Text</th>);

  headerNodes = headerNodes.concat(
    headers.map(header => (
      <th key={header} style={answerStyle}>
        {header}
        {types[header] == 'url' && newScrapeNode(header)}
      </th>)
    ));

  const numResults = targets ? targets.length : 0;

  let rows;
  if (numResults == 0) {
    rows = (
      <tr>
      </tr>
    );
  } else {

    rows = [];

    for (let tIndex = 0; tIndex < targets.length; tIndex++) {
      const target = targets[tIndex];

      // The first row
      const num = (target.answer || []).length;
      const rowSpan = num || 1
      let cells = [];
      cells.push(
        <td key="action" style={{ width: 1 }} rowSpan={rowSpan}>
          <div style={{ display: 'flex' }}>
            <IoPlayCircle style={{ color: '#ddd', cursor: 'pointer' }} onClick={() => onScrape([target.url])} size={18} />
            {' '}
            <IoMdCloseCircle style={{ color: '#ddd', cursor: 'pointer' }} onClick={() => onRemove([target.url])} size={18} />
          </div>
        </td>);
      cells.push(
        <td
          key="status"
          rowSpan={rowSpan}
          style={{ whiteSpace: 'nowrap',
                   textAlign: 'center',
                 }}>
          <div style={{ width: 80, textAlign: 'center' }}>
            {target.loading && <Loading width={14} />}
            {!target.loading && target.status}
            {/*num && num > 1 ? (' (' + num + ')') : ''*/}
          </div>
        </td>
      );

      // One row per answer
      let count = 0;
      for (const answer of (target.answer || [{}])) {
        cells.push(
          <td
            key="url"
            style={{ ...answerStyle,
                     ...(highlight == 'URL' ? highlightStyle : {})
                   }}
            >
            {target.url}
          </td>);

        // cells.push(
        //   <td key="linktext" style={{ width: 180, overflow: 'hidden' }}>
        //     {target.text}
        //   </td>);

        for (const header of headers) {
          cells.push(
            <td
              key={header}
              style={{ ...answerStyle,
                       ...(highlight == header ? highlightStyle : {})
                     }}
              >
              {answer[header]}
            </td>);
        }

        rows.push(
          <tr key={i++} style={{ verticalAlign: 'top' }}>
            {cells}
          </tr>);

        cells = [];
      }
    }
  }

  const counts = {
    total: 0,
    scraped: 0,
    error: 0,
  }

  for (const target of (targets || [])) {

    console.log('count', target, counts);

    counts.total++;
    for (const a of (target.answer || [])) {
      counts.scraped++;
    }
    if (target.status == 'error') {
      counts.error++;
    }
  }

  let countsStr = '';

  if (job.scrape?.scrapeType == 'multiPage') {
    countsStr += counts.total + ' ' + (counts.total == 1 ? 'result' : 'results');
    countsStr += ' (' + counts.scraped + ' scraped';
    if (counts.error > 0) {
      countsStr += ', ' + counts.error + ' error'+ (counts.error == 1 ? '' : 's');
    }
    countsStr += ')';
  } else {
    countsStr = counts.scraped + ' results';
    if (counts.error > 0) {
      countsStr += ' (' + counts.error + ' error'+ (counts.error == 1 ? '' : 's') + ')';g
    }
  }

  return (
    <div style={{ overflowX: 'scroll', margin: '10px 0' }}>

      <div style={{ margin: '5px 0' }}>{countsStr}</div>

      <table style={{ width: '100%' }}>
        <thead><tr>{headerNodes}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
};


const Welcome = ({ isPopup, onStart, onSkip }) => {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState();
  const jobs = useJobs();

  useEffect(() => {
    getActiveTab()
      .then(tab => setUrl(tab.url));
  }, []);

  const examples = [
    [
      'Find comment pages, get main topic, and tone in 1-3 words',
      'https://news.ycombinator.com/',
    ],
    [
      'Find number of bedrooms, bathrooms, 2-5 word summary',
      'https://sfbay.craigslist.org/search/apa#search=1~list~0~0',
    ],
    [
      'Find articles, get title, author, date, key people, company',
      'https://techcrunch.com/',
    ],
  ];

  const exampleStyle = {
    cursor: 'pointer',
    background: '#0006',
    color: '#bbb',
    padding: 10,
    borderRadius: 10,
    flexBasis: '100%',
  };

  const jobStyle = {
    cursor: 'pointer',
    background: '#0006',
    color: '#bbb',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const instructionStyle = {
    textAlign: 'center',
    marginTop: jobs.length == 0 ? 40 : 20,
  };

  const handleKeyDown = (e) => {
    if (e.key == 'Enter' && !e.shiftKey) {
      handleSubmit(e, prompt, url, true);
    } else {
      setPrompt(e.target.value);
    }
  }

  const handleSubmit = async (e, prompt, url, isActive) => {
    if (e.shiftKey) {
      setPrompt(e.target.value + '\n');
      return;
    }

    e.preventDefault();

    setLoading(true);
    const page = isActive ? (await getTabData()) : null;
    const useUrl = isActive ? (await getActiveTab()).url : url;
    try {
      const job = await genJob(prompt, useUrl, page);

      console.log('==== DONE ====');
      console.log('genjob gave:', job);
      return onStart(job);
    } catch (e) {
      setGlobalError('Erorr generating job, try again: ' + e);
      setLoading(false);
      throw e;
    }
  };

  const handleExample = async (e, prompt, url) => {
    await setPrompt(prompt);
    await setUrl(url);
    const resp = await handleSubmit(e, prompt, url);

    console.log('example resp', resp);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.update(tabs[0].id, { url });
    });

    if (isPopup) {
      openPanel();
    }
  }

  let i = 0;
  const exampleNodes = examples.map(([prompt, url]) => {
    return (
      <div
        style={exampleStyle}
        onClick={(e) => handleExample(e, prompt, url)}
        key={i++}
        >
        <div style={{ whiteSpace: 'nowrap', marginBottom: 4 }}>
          <b>{(new URL(url)).hostname}</b>
        </div>
        {prompt}
      </div>
    );
  });

  const jobNodes = jobs.filter(j => j && j.name && !j.name.startsWith('Untitled'))
    .slice(0, 4)
    .map((j) => {
      return (
        <div
          style={jobStyle}
          onClick={() => onStart(j)}
          >
          {j.name}
        </div>
      )});

  const loadingNode = (
    <div style={{ position: 'absolute',
                  width: '100%',
                  textAlign: 'center',
                  bottom: 0,
                }}>
      <Loading width={24} />
    </div>
  );

  const inputNode = (
    <form onSubmit={(e) => handleSubmit(e, prompt, url, true)}>
      <div style={{ position: 'relative',
                    width: '100%',
                    marginTop: 8,
                    opacity: loading ? 0.5 : 1,
                  }}>
        <div style={{ position: 'absolute',
                      right: 2,
                      bottom: 5,
                    }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: 16,
                     height: 30,
                     width: 30,
                     borderRadius: 15,
                     display: 'inline-block',
                   }}
            >
            <div style={{ display: 'flex',
                          justifyContent: 'center',
                        }}>
              {loading ? <Loading width={16} /> : <FaArrowRight size={16} /> }
            </div>
          </button>
        </div>

        <div style={{ width: '100%' }}>
          <Textarea
            type="text"
            style={{ width: '100%',
                     fontFamily: 'sans-serif',
                     fontSize: 16,
                     resize: 'none',
                     padding: 8,
                     paddingLeft: 12,
                     paddingRight: 36,
                     border: 0,
                     borderRadius: 18,
                     minHeight: 80,
                   }}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Example: "Look for links to articles, and on each article page, find the author, the publication date, and summarize it in 2-10 words."'}
          />
        </div>
      </div>
    </form>
  );

  const prevNode = (
    <div>
      <div style={instructionStyle}>Previous scrapes</div>
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 5,
                    marginTop: 10,
                  }}>
        {jobNodes}
      </div>
    </div>
  );

  return (
    <div style={{ ...mainStyle, paddingBottom: 10, paddingTop: 40 }}>

      <FoxSays message="Hi! I'm FetchFox" />

      <div style={instructionStyle}>Try these examples</div>
      <div style={{ display: 'flex',
                    width: '100%',
                    gap: 10,
                    marginTop: 10, }}>
        {exampleNodes}
      </div>

      {jobNodes.length > 0 && prevNode}

      <div style={instructionStyle}>Create your own scrape</div>
      <div style={{ marginTop: 10,
                    background: '#fff2',
                    padding: 10,
                    borderRadius: 10,
                  }}>
        <div style={{ color: '#bbb' }}>Scrape <b style={{ color: '#fff' }}>{url}</b></div>

        <div style={{ position: 'relative' }}>
          {/*loading && loadingNode*/}
          {inputNode}
        </div>

      </div>

      <div style={{...instructionStyle, marginBottom: 40 }}>
        Know what you're doing?{' '}
        <span className="clickable" onClick={onSkip}>
          Go to Editor &raquo;
        </span>
      </div>

    </div>
  )
}

const Inner = ({
  isPopup,
  onNewJob,
  onNewJobFromUrls,
  onShowSettings }) => {

  // const [showSettings, setShowSettings] = useState();
  const { key: openAiKey, plan: openAiPlan, loading: loadingOpenAiKey } = useOpenAiKey('loading');
  const job = useActiveJob();

  console.log('Active job:', job);

  const handleScrape = async (urls) => {
    return runScrape(job, urls);
  }

  const handleRemove = async (urls) => {
    console.log('remove these target urls:', urls);
    removeUrlsFromJob(job.id, urls);
  }

  const clearAll = async () => {
    clearJobResults(job.id);
  }

  const clearScrape = async () => {
    await setJobResults(job.id, { answers: {} }, true);
    await setScrapeStatus(
      job.id,
      await getRoundId(),
      (job.results?.targets || []).map(t => t.url),
      'new');
  }

  if (loadingOpenAiKey) {
    return null;
  }

  const handleRun = async () => {
    if (isPopup) {
      await maybeOpenPanel(job);
    }
    runJob(job);
  };

  const currentStep = (job?.results?.targets || []).length == 0 ? 1 : 2;
  const noAnswers = (job?.results?.targets || []).filter(r => !!r.answer).length == 0;

  return (
    <div style={mainStyle}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>

        {/*<pre>{JSON.stringify(job, null, 2)}</pre>*/}

        <div>
          <img src={fox} style={{ width: 32, height: 32 }} />
        </div>

        <div style={{ width: '100%',
                      textAlign: 'left',
                      fontSize: 14,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
          {job?.name}
        </div>
        <div style={{ whiteSpace: 'nowrap' }}>
          <button
            className="btn btn-gray"
            onClick={onNewJob}
            >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <HiMiniPencilSquare size={14} /> New Scrape
            </div>
          </button>

        </div>
        <div>
          <div
            style={{ cursor: 'pointer', position: 'relative', top: 1 }}
            onClick={onShowSettings}
            >
            <IoMdSettings size={24}/>
          </div>
        </div>
      </div>

      <UrlsStep
        job={job}
        isPopup={isPopup}
      />

      <ScrapeStep
        job={job}
        isPopup={isPopup}
      />

      <br />
      <br />
      <button
        className="btn btn-gray"
        disabled={currentStep < 2}
        onClick={() => downloadJobCsv(job)}
        >
        <FaFileCsv size={12} /> Download CSV
      </button>{' '}
      <Share job={job} />{' '}
      <button
        className="btn btn-gray"
        disabled={currentStep < 2}
        onClick={clearAll}
        >
        Clear All Data
      </button>{' '}
      <button
        className="btn btn-gray"
        disabled={currentStep < 2 || noAnswers}
        onClick={clearScrape}
        >
        Clear Answers
      </button>

      <Results
        job={job}
        targets={job?.results?.targets || []}
        onScrape={handleScrape}
        onRemove={handleRemove}
        onNewJobFromUrls={onNewJobFromUrls}
      />

      <StatusBar onRun={handleRun} />
    </div>
  );
}

export const Scrape = ({ isPopup }) => {
  const {
    key: openAiKey,
    plan: openAiPlan,
    loading: loadingOpenAiKey,
  } = useOpenAiKey('loading');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState();

  const activeJob = useActiveJob();

  useEffect(() => {
    if (loadingOpenAiKey) return;
    if (step == 'settings') return;

    if (!openAiPlan || (openAiPlan == 'openai' && !openAiKey)) {
      setStep('settings');
    } else {
      if (!step) {
        setStep('welcome');
      }
    }
  }, [openAiKey, openAiPlan, loadingOpenAiKey]);

  useEffect(() => {
    getKey('scrapeStep').then((s) => {
      setLoading(false);
      setStep(s);
    });
  }, []);

  const handleSkip = async () => {
    if (!activeJob) {
      handleStart(await genBlankJob());
    } else {
      setStep('inner');
      setKey('scrapeStep', 'inner');
    }
  }

  const handleStart = async (job) => {
    await saveJob(job);
    await setActiveJob(job.id);
    setStep('inner');
    setKey('scrapeStep', 'inner');
  };

  const handleNew = async () => {
    await setKey('scrapeStep', 'welcome');
    await setStep('welcome');
  }

  const handleNewFromUrls = async (urls) => {
    handleStart(await genJobFromUrls(urls));
    window.scrollTo(0, 0);
  }

  let body;
  if (loading || loadingOpenAiKey) {
    body = (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Loading size={50} />
      </div>
    );
  } else if (step == 'settings') {
    body = (
      <div style={mainStyle}>
        <OpenAiKeyEntry onDone={() => { setStep('welcome') }}
        />
      </div>
    );
  } else if (step == 'welcome') {
    body = (
      <Welcome
        isPopup={isPopup}
        onStart={handleStart}
        onSkip={handleSkip}
      />
    );
  } else {
    body = (
      <Inner
        isPopup={isPopup}
        onNewJob={handleNew}
        onNewJobFromUrls={handleNewFromUrls}
        onShowSettings={() => setStep('settings')}
      />
    );
  }
  return (
    <div style={{ minHeight: 560 }}>
      <HelpBar />

      <GlobalError />
      {body}
    </div>
  )
}
