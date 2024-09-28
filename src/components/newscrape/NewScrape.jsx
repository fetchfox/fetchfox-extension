import React, { useState, useEffect } from 'react';
import { IoIosArrowDroprightCircle } from 'react-icons/io';
import { FaShareFromSquare } from 'react-icons/fa6';
import { shareResults } from '../../lib/share.mjs';
import { bgColor } from  '../../lib/constants.mjs';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { getJobColumn } from '../../lib/util.mjs';
import { LuCopy, LuCopyCheck } from 'react-icons/lu';
import { Loading } from '../common/Loading';
import { InputPrompt } from '../prompt/InputPrompt';
import { genJobFromUrls } from '../../lib/gen.mjs';
import {
  getKey,
  setKey,
  saveJob,
  setActiveJob,
} from '../../lib/store.mjs';

const NewScrapeModal = ({ job, header, onSubmit, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState();

  const urls = getJobColumn(job, header)

  let body;
  if (false) {
    body = <div style={{ textAlign: 'center' }}><Loading size={14} /></div>;
  } else {
    body = (
      <div>
        <div>Create a new scrape from the URLs below</div>
        <div style={{ fontSize: 12,
                      maxHeight: 100,
                      overflow: 'hidden',
                      background: '#0005',
                      color: '#bbb',
                      borderRadius: 4,
                      padding: 10,
                      marginTop: 10, 
                    }}>
          {urls.map(x => <div>{x}</div>)}
        </div>

        <InputPrompt
          onSubmit={(e) => { setLoading(true); onSubmit(e, prompt, urls)}}
          onChange={(e) => setPrompt(e.target.value)}
          prompt={prompt}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed',
                  display: 'flex',
                  top: 0,
                  left: 0,
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  zIndex: 100,
                  padding: 40,
                  background: '#0008',
                  fontWeight: 'normal',
                  textAlign: 'left',
                }}
      onClick={onClose}
      >

      <div style={{ background: bgColor,
                    padding: 20,
                    border: '1px solid #444',
                    borderRadius: 8,
                    width: '100%',
                    fontSize: 14,
                  }}
        onClick={(e) => e.stopPropagation()}
        >
        {body}
      </div>
    </div>
  );
}

export const NewScrape = ({ job, header }) => {
  const [show, setShow] = useState();

  const handleSubmit = async (e, prompt, urls) => {
    e.preventDefault();
    const job = await genJobFromUrls(prompt, urls);
    console.log('new scrape job -->', job);
    await saveJob(job);
    await setActiveJob(job.id);
    await setKey('scrapeStep', 'inner');
    window.scrollTo(0, 0);
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {show && <NewScrapeModal
       job={job}
       header={header}
       onSubmit={handleSubmit}
       onClose={() => setShow(false)}
      />}

      <button
        className="btn btn-gray"
        onClick={() => setShow(true)}
        >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5}}>
          Scrape These <IoIosArrowDroprightCircle size={14} />
        </div>
      </button>
    </div>
  );
}
