import assert from 'assert';
import { promises as fs } from 'fs';
import path from 'path';

import { scrapePage } from '../src/lib/scrape';

const testFile = async (filenames, questions, expecteds) => {
  let total = 0;
  let correct = 0;
  for (let i = 0; i < filenames.length; i++) {
    const page = JSON.parse(await fs.readFile(filenames[i], 'utf8'));
    const result = await scrapePage(page, questions, () => {});
    for (let j = 0; j < questions.length; j++) {
      const expected = expecteds[i][j];
      const actual = result[questions[j]];
      total++;
      if (expected == actual) {
        correct++;
      }
    }
  }

  console.log('total:  ', total);
  console.log('correct:', correct);
}


describe('AI scrape', function () {
  this.timeout(500 * 1000);

  it('should scrape YC comments', async () => {
    await testFile(
      [
        'test/data/hackernews-comments.1.scrape.json',
        'test/data/hackernews-comments.2.scrape.json',
        'test/data/hackernews-comments.3.scrape.json',
      ],
      [
        'find the top comment. what is the timestamp of this top comment?',
        'what is the username of the author of the top comment?',
      ],
      [
        ['16 hours ago', 'jmcgough'],
        ['1 minute ago', 'idontknowtech'],
        ['6 minutes ago', 'perihelions'],
      ]
    );
  });
});

