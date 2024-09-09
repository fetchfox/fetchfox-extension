import React, { useState, useEffect } from 'react';
import { FaShareFromSquare } from 'react-icons/fa6';
import { bgColor, errorColor, discordUrl, gitHubIssuesUrl } from  '../../lib/constants.mjs';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { LuCopy, LuCopyCheck } from 'react-icons/lu';
import { Loading } from '../common/Loading';

const ReportModal = ({ id, onDone }) => {
  const [copied, setCopied] = useState();

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const reportMsg = 'Report ID: ' + id;

  let body;
  if (id == 'loading') {
    body = <div style={{ textAlign: 'center' }}><Loading size={14} /></div>;
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 5,
                      borderRadius: 4,
                      padding: '4px 8px',
                      background: 'rgba(255,255,255,0.1)',
                    }}>
          <div>
            {reportMsg}
          </div>
          <div>
            <CopyToClipboard text={reportMsg}
              onCopy={handleCopy}>
              <button className="btn btn-gray" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                Copy{' '}
                {copied && <LuCopyCheck size={18} />}
                {!copied && <LuCopy size={18} />}
              </button>
            </CopyToClipboard>
          </div>
        </div>
        <div>
          Please include the report ID and open issue on <a href={gitHubIssuesUrl} className="clickable" target="_blank">GitHub</a> or send a message on <a href={discordUrl} className="clickable" target="_blank">Discord</a>
        </div>
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
                }}
      onClick={onDone}
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

export const Report = () => {
  const [id, setId] = useState();

  const handleReport = () => {
    setId('loading');
    chrome.runtime.sendMessage({ action: 'reportBug' })
      .then(resp => setId(resp.id));
  }

  return (
    <div>
      {id && <ReportModal id={id} onDone={() => setId(null)} />}
      <button
        className="btn btn-gray"
        onClick={handleReport}
        >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <div>Report Issue</div>
          <FaShareFromSquare size={12} />
        </div>
      </button>
    </div>
  );
}
