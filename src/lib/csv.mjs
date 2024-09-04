import {
  mkConfig,
  generateCsv,
  download,
} from 'export-to-csv';

export const downloadJobCsv = (job) => {
  console.log('downloadJobCsv ->', job);

  const filename = 'FetchFox - ' + job.name;
  const csvConfig = mkConfig({ useKeysAsHeaders: true, filename });
  const rows = toRows(job);
  console.log('CSV rows:', rows);
  const csv = generateCsv(csvConfig)(rows);
  download(csvConfig)(csv);
}

export const toRows = (job) => {
  if (!job?.results?.targets) return [[]];

  let answerHeaders;
  if (job.results?.answerHeaders) {
    answerHeaders = job.results?.answerHeaders;
  } else {
    const answerNames = {};
    for (const target of job.results.targets) {
      for (const key of Object.keys(target.answer || {})) {
        answerNames[key] = true;
      }
    }
    answerHeaders = Object.keys(answerNames);
  }

  const headers = [
    'URL',
    'Link Text',
    'Status',
    ...(answerHeaders),
  ];

  const rows = [headers];

  for (const target of job.results.targets) {
    const answer = target.answer || [{}];
    for (const a of answer) {
      const answerValues = answerHeaders.map(h => a[h]);
      const row = [
        target.url,
        target.text,
        target.status,
        ...answerValues,
      ];
      rows.push(row);
    }
  }

  return rows;
}
