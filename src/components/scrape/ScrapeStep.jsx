import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiEdit2 } from 'react-icons/fi';
import Textarea from 'react-expanding-textarea';
import { MdEditSquare } from 'react-icons/md';
import { set } from 'radash';
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
import { formatNumber, getJobColumn, getJobUrl, sleep } from '../../lib/util.mjs';
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
import { useLocal } from '../../state/storage';
import { Loading } from '../common/Loading';
import { Checkbox } from '../common/Checkbox';
import { Pills } from '../common/Pills';
import { Error } from '../common/Error';
import { HelpBar } from '../common/HelpBar';
import { GlobalError } from '../common/GlobalError';
import { Input } from '../common/Input';
import { OpenAiKeyEntry } from '../openai/OpenAiKeyEntry';
import { Pagination } from '../pagination/Pagination';
import { PerPage } from '../perpage/PerPage';
import { Share } from '../share/Share';
import { FoxSays } from '../fox/FoxSays';
import { Results } from './Results';
import { InputPrompt } from '../prompt/InputPrompt';
import fox from '../../assets/img/fox-transparent.png';
import {
  blankJob,
  mainStyle,
  stepStyle,
  stepHeaderStyle,
  smallButtonStyle,
  maybeOpenPanel,
} from './shared.js';


export const ScrapeStep = ({ jobId, isPopup, onChange, onClick }) => {
  const { job, setJob } = useJob(jobId);

  const [sleepTime, setSleepTime] = useState();
  const numResults = (job?.results?.targets || []).length;
  const currentStep = numResults == 0 ? 1 : 2;
  const autoSleepTime = useAutoSleepTime();

  const handle = async (keys, val) => {
    return setJob(set(job, keys, val));
  }

  const updateQuestion = async (index, val) => {
    const q = {...job.scrape.questions};
    q[index] = val;
    handle('scrape.questions', job.scrape.questions);
  };

  const removeQuestion = (index) => {
    const q = {...job.scrape.questions};
    q.splice(index, 1);
    handle('scrape.questions', q);
  }

  const addQuestion = () => {
    const q = {...job.scrape.questions};
    q.push('');
    handle('scrape.questions', q);
  }

  let i = 0;
  const nodes = (job?.scrape?.questions || []).map(q => {
    const index = i++;
    return (
      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: '100%' }}>
          <Input
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
          value={job?.scrape?.concurrency}
          onChange={(e) => handle('scrape.concurrency', e.target.value)}
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
          onChange={(e) => handle('scrape.sleepTime', e.target.value)}
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


  if (!job) return null;

  return (
    <div style={stepStyle}>
      <pre>{JSON.stringify(job.scrape, null, 2)}</pre>
      <div style={stepHeaderStyle}>What do you want to scrape on {job.urls?.action == 'current' ? 'this' : 'each'} page?</div>
      {nodes}

      <div
        className="btn btn-gray"
        style={{ display: 'flex', alignItems: 'center', width: 92, justifyContent: 'center'}}
        onClick={addQuestion}
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
