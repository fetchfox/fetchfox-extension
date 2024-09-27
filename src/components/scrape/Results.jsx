import React, { useState, useEffect, useRef } from 'react';
import {
  IoMdSettings,
  IoMdAddCircle,
  IoMdCloseCircle,
  IoMdArrowBack,
  IoIosArrowDroprightCircle,
} from 'react-icons/io';
import { IoPlayCircle, IoCloseCircle } from 'react-icons/io5';
import { Loading } from '../common/Loading';

export const Results = ({
  job,
  targets,
  onScrape,
  onRemove,
  onNewJobFromUrls }) =>
{

  const [highlight, setHighlight] = useState();
  const headers = job?.results?.answerHeaders || [];
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
            Scrape These <IoIosArrowDroprightCircle size={14} />
          </div>
        </button>
      </div>
    )
  }

  let i = 0;
  let headerNodes = [];
  headerNodes.push(<th key="action"></th>);
  headerNodes.push(<th key="status" style={{ maxWidth: 80 }}>status</th>);
  headerNodes.push(<th key="url" style={urlStyle}>URL</th>);
  headerNodes.push(<th key="text" style={{ width: 100 }}>Link Text</th>);

  headerNodes = headerNodes.concat(
    headers.map(header => (
      <th key={header} style={answerStyle}>
        {header}
        {types[header] == 'url' && newScrapeNode(header)}
      </th>)
    ));

  const numResults = targets ? targets.length : 0;

  const shortUrl = (url) => {
    if (url.length < 100) return url;
    return url.substr(0, 90) + '...';
  }

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
            {num && num > 1 ? (' (' + num + ')') : ''}
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
            {shortUrl(target.url)}
          </td>);

        cells.push(
          <td key="linktext" style={{ width: 180, overflow: 'hidden' }}>
            {target.text}
          </td>);

        for (const header of headers) {
          cells.push(
            <td
              key={header}
              style={{ ...answerStyle,
                       ...(highlight == header ? highlightStyle : {})
                     }}
              >
              {typeof answer[header] == 'string' ? answer[header] : JSON.stringify(answer[header])}
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
      countsStr += ' (' + counts.error + ' error'+ (counts.error == 1 ? '' : 's') + ')';
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
}
