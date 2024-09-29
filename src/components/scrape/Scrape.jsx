import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiEdit2 } from 'react-icons/fi';
import Textarea from 'react-expanding-textarea';
import { MdEditSquare } from 'react-icons/md';
import {
  IoMdSettings,
  IoMdAddCircle,
  IoMdCloseCircle,
  IoMdArrowBack,
  IoIosArrowDroprightCircle,
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
import { formatNumber, getJobColumn, getJobUrl } from '../../lib/util.mjs';
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
import { useOpenAiKey, useUsage, useQuota } from '../../state/openai';
import { Loading } from '../common/Loading';
import { Checkbox } from '../common/Checkbox';
import { Pills } from '../common/Pills';
import { Error } from '../common/Error';
import { HelpBar } from '../common/HelpBar';
import { GlobalError } from '../common/GlobalError';
import { OpenAiKeyEntry } from '../openai/OpenAiKeyEntry';
import { Pagination } from '../pagination/Pagination';
import { PerPage } from '../perpage/PerPage';
import { Share } from '../share/Share';
import { FoxSays } from '../fox/FoxSays';
import { Results } from './Results';
import { InputPrompt } from '../prompt/InputPrompt';
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
};

const maybeOpenPanel = async (job) => {
  let shouldOpen = true;

  if (!(job.scrape?.concurrency < 0)) shouldOpen = false;
  if (job.urls?.action == 'current') shouldOpen = false;
  if (job.urls?.pagination?.follow) shouldOpen = true;

  if (shouldOpen) openPanel();
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
  const [busy, setBusy] = useState();
  const [statusHeight, setStatusHeight] = useState(0);
  const roundId = useRoundId(0);
  const usage = useUsage();

  console.log('sb icon?', chrome.action);

  useEffect(() => {
    setBusy(loading || inFlight != 0);
  }, [loading, inFlight]);

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
            <span> ({`${completion.done}/${completion.total}`})</span>
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
  const [pagination, setPagination] = useState();
  const [perPage, setPerPage] = useState();
  const [error, setError] = useState();

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
    setError(null);
    console.log('mmm currentUrl', currentUrl);
    if (currentUrl.indexOf('https://chromewebstore.google.com') != -1) {
      setError('Due to Google policy, cannot scrape Chrome Extension Store');
    }
  }, [currentUrl]);

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
    updatePerPage('guess');
  }

  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults == 0 ? 1 : 2;

  const updateJob = (field, val, setter) => {
    setter(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
  const updatePagination = (f) => updateJob('pagination', f, setPagination);
  const updatePerPage = (f) => updateJob('perPage', f, setPerPage);

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
    updatePagination(job.urls?.pagination);
    updatePerPage(job.urls?.perPage);
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

  const perPageNode = (
    <PerPage
      perPage={perPage}
      onChange={updatePerPage}
    />
  );

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
      {perPageNode}

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

      <Pagination
        url={currentUrl}
        onChange={updatePagination}
        follow={job.urls?.pagination?.follow || false}
        count={job.urls?.pagination?.count || 0}
      />

      {/*<pre>{JSON.stringify(job.urls?.pagination, null, 2)}</pre>*/}

      {questionNode}
      {perPageNode}
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

      {action == 'current' && currentNode}
      {action == 'gather' && gatherNode}
      {action == 'manual' && manualNode}

      <Error message={error} />
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

      {['gather', 'manual'].includes(job.urls?.action) && controlsNode}

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

const Welcome = ({ isPopup, onStart, onSkip }) => {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState();
  const [manual, setManual] = useState();
  const [manualUrls, setManualUrls] = useState('');
  const [disabled, setDisabled] = useState();
  const jobs = useJobs();

  useEffect(() => {
    getActiveTab().then(tab => setUrl(tab.url));
    getKey('masterPrompt').then(val => setPrompt(val || ''));
  }, []);

  useEffect(() => {
    setDisabled(manual && !manualUrls.trim());
  }, [manual, manualUrls]);

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

  const handleExample = async (e, prompt, url) => {
    await setPrompt(prompt);
    await setUrl(url);
    const resp = await handleSubmit(e, prompt, url);
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

  const handleSubmit = async (e, prompt, url, isActive) => {
    e.preventDefault();
    setLoading(true);

    try {
      const useUrl = isActive ? (await getActiveTab()).url : url;
      let job;
      if (manual) {
        job = await genJobFromUrls(prompt, manualUrls.split('\n'));
      } else {
        const page = isActive ? (await getTabData()) : null;
        if (page.error) {
          setGlobalError(page.error);
          return;
        }
        job = await genJob(prompt, useUrl, page);
      }
      console.log('==== GEN JOB DONE ====');
      console.log('mmm genjob gave:', job);
      return onStart(job);
    } catch (e) {
      console.log('mmm caught error in generate job:', e);
      setGlobalError('Error generating job, try again: ' + e);
      throw e;
    } finally {
      setLoading(false);
    }
  };


  const timeoutRef = useRef(null);
  const updatePrompt = (e) => {
    console.log('updatePrompt', e.target.value);
    setPrompt(e.target.value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => setKey('masterPrompt', e.target.value),
      100);
  }

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
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 5,
                    marginTop: 10,
                  }}>
        {jobNodes}
      </div>
    </div>
  );

  let urlNode
  if (manual) {
    urlNode = (
      <div style={{ color: '#bbb' }}>
        <div>Scrape these URLs (one per line)</div>
        <Textarea
          style={{ width: '100%',
                   fontFamily: 'sans-serif',
                   fontSize: 14,
                   margin: '5px 0',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#bbb' }}>
        <div>Scrape <b style={{ color: '#fff' }}>{url}</b></div>
        <MdEditSquare style={{ cursor: 'pointer' }} onClick={() => { setManual(true); setManualUrls(url) }} />
      </div>
    );
  }

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
        {urlNode}
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
  );
}

const Inner = ({ isPopup, onNewJob, onShowSettings }) => {

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

  const controlsNode = (
    <div>
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
    </div>
  );

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
}

const QuotaError = () => {
  const quota = useQuota();

  return (
    <div style={{ color: 'white' }}>
      quota error?
      <pre>{JSON.stringify(quota, null, 2)}</pre>
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
  const quota = useQuota();

  const activeJob = useActiveJob();

  useEffect(() => {
    console.log('what should we do?', openAiPlan, openAiKey, loading);

    if (loadingOpenAiKey) return;
    setLoading(false);
    if (step == 'settings') return;

    if (!openAiPlan || (openAiPlan == 'openai' && !openAiKey)) {
      setStep('settings');
    } else {
      if (!step) setStep('welcome');
    }
  }, [openAiKey, openAiPlan, loadingOpenAiKey]);

  useEffect(() => {
    if (!activeJob) return;
    if (!loading) return;

    console.log('activeJob changed, check if we need to change the step', step);

    getActiveTab()
      .then(async (tab) => {
        const jobUrl = getJobUrl(activeJob) || '';
        const tabUrl = tab ? tab.url : '';
        const tabHostname = tabUrl ? (new URL(tabUrl)).hostname : '';

        const inFlight = await getKey('inFlight');
        if (inFlight > 0) {
          // Job is running, go to inner page
          setStep('inner');
          setLoading(false);
        } else if (jobUrl && jobUrl.indexOf(tabHostname) == -1) {
          // New domain, assume new job
          console.log('new domain, so change the step');
          setStep('welcome');
          setLoading(false);
        } else {
          // Pick up where we left off
          console.log('not changing step');
          setStep(await getKey('scrapeStep') || 'welcome');
          setLoading(false);
        }
      });

  }, [activeJob]);

  const handleSkip = async () => {
    if (!activeJob) {
      handleStart(await genBlankJob());
    } else {
      await setKey('scrapeStep', 'inner');
      setStep('inner');
    }
  }

  const handleStart = async (job) => {
    await saveJob(job);
    await setActiveJob(job.id);
    await setKey('scrapeStep', 'inner');
    await setStep('inner');
    setKey('masterPrompt', '');
    window.scrollTo(0, 0);
  };

  const handleNew = async () => {
    await setKey('scrapeStep', 'welcome');
    await setStep('welcome');
  }

  let body;

  if (loading || loadingOpenAiKey) {
    body = (
      <div style={{ padding: 50, textAlign: 'center', color: 'white' }}>
        <Loading size={50} />
        <p>loading? {''+loading}</p>
        <p>loadingOpenAiKey? {''+loadingOpenAiKey}</p>
      </div>
    );
  } else if (!quota.ok || step == 'settings') {
    body = (
      <div style={mainStyle}>
        <OpenAiKeyEntry onDone={() => { setStep('welcome') }} />
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
  );
}
