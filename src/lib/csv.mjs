import {
  mkConfig,
  generateCsv,
  download,
} from 'export-to-csv';

export const downloadJobCsv = (job) => {
  console.log('downloadJobCsv ->', job);

  const filename = 'FetchFox - ' + job.name;
  const csvConfig = mkConfig({ useKeysAsHeaders: true, filename });
  const data = (job?.results?.targets || [])
        .map(t => {
          const r = {
            URL: t.url,
            'Link Text': t.text,
            Status: t.status,
          };
          return Object.assign(r, t.answer);
        });
  console.log('data:', data);
  const csv = generateCsv(csvConfig)(data);
  download(csvConfig)(csv);
}
