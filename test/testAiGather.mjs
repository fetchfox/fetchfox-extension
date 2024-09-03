import assert from 'assert';
import { promises as fs } from 'fs';
import path from 'path';

import { parseLinks } from '../src/lib/gather.mjs';

import { expected as expectedAmazonSoap } from './data/amazonsoap.1.mjs';
import { expected as expectedLinkedIn } from './data/linkedin.1.mjs';
import { expected as expectedRedfin } from './data/redfin.1.mjs';
import { expected as expectedEtsy } from './data/etsy.1.mjs';
import { expected as expectedEbay } from './data/ebay.1.mjs';

const testFile = async (filename, question, expected) => {
  const page = await fs.readFile(filename, 'utf8');  
  const data = JSON.parse(page);
  const links = await parseLinks(data, question, () => {});

  console.log('');
  console.log('');
  console.log('Results:');
  let [matches, extras] = [0, 0];

  const norm = s => decodeURIComponent(s.replaceAll('&amp;', '&'));
  if(expected) expected = expected.map(norm);

  for (let link of links) {
    console.log('- text:', link.text.replaceAll('\n', ' '));
    console.log('- url: ', link.url);

    if (expected) {

      if (expected.includes(norm(link.url))) {
        console.log('- MATCH');
        matches++;
      } else {
        console.log('- EXTRA');
        extras++;
      }
    }
    console.log('');
  }

  if (expected) {
    console.log('Summary:');
    console.log('- expected:', expected.length);
    console.log('- matches: ', matches);
    console.log('- extras:  ', extras);
  }

  return { expected: (expected || []).length, matches, extras };
};

describe('AI gather', function () {
  this.timeout(500 * 1000);
  let partial;
  let partials = {};
  let combined = { expected: 0, matches: 0, extras: 0 };

  afterEach(function() {
    console.log('partial  >', partial, this.currentTest.title);
    partials[this.currentTest.title] = partial;
    combined.expected += partial.expected;
    combined.matches += partial.matches;
    combined.extras += partial.extras;
  });

  after(function() {
    console.log('');
    console.log('====');
    for (const k of Object.keys(partials)) {
      console.log('partial  >', partials[k], k);
    }
    console.log('');
    console.log('combined >', combined);
  });

  it('should gather wayfair dressers', async () => {
    partial = await testFile(
      'test/data/wayfair.1.gather.json',
      'links to dressers, ONLY links to product pages that are dressers and nothing else'
    );
  });

  it('should gather reddit mma', async () => {
    partial = await testFile(
      'test/data/reddit.1.gather.json',
      'article links. do NOT include links on reddit.com'
    );
  });

  it('should gather reddit profiles', async () => {
    partial = await testFile(
      'test/data/reddit.1.gather.json',
      'reddit user profile links',
      [
        'https://www.reddit.com/user/AbrahamRinkin',
        'https://www.reddit.com/user/AliBagovBeatKhabib',
        'https://www.reddit.com/user/AutoModerator',
        'https://www.reddit.com/user/Blacker_Jesus',
        'https://www.reddit.com/user/BotnetUser',
        'https://www.reddit.com/user/BustaTron',
        'https://www.reddit.com/user/Designer-Stage1825',
        'https://www.reddit.com/user/GorillaOnChest',
        'https://www.reddit.com/user/Hawkeye76',
        'https://www.reddit.com/user/LatterTarget7',
        'https://www.reddit.com/user/Loganbaker2147',
        'https://www.reddit.com/user/MarbledNightmare',
        'https://www.reddit.com/user/MoustacheLightning',
        'https://www.reddit.com/user/OchoMuerte-XL',
        'https://www.reddit.com/user/SegaCKY',
        'https://www.reddit.com/user/The_Majestic_Banana',
        'https://www.reddit.com/user/TradeBrockNelson',
        'https://www.reddit.com/user/XniklasX',
        'https://www.reddit.com/user/YeahBishMagnets',
        'https://www.reddit.com/user/Yodsanan',
        'https://www.reddit.com/user/ayushc3po',
        'https://www.reddit.com/user/buzznights',
        'https://www.reddit.com/user/epicfishboy',
        'https://www.reddit.com/user/fightsgoneby',
        'https://www.reddit.com/user/random_sTp',
        'https://www.reddit.com/user/realest-dawg',
        'https://www.reddit.com/user/riga345',
        'https://www.reddit.com/user/rmma',
        'https://www.reddit.com/user/synapticrelease',
        'https://www.reddit.com/user/textorix',
        'https://www.reddit.com/user/thiswasnotyettaken',
        'https://www.reddit.com/user/toldyouanditoldyou',
      ]
    );
  });

  it('should gather yc hackernews comment pages', async () => {
    partial = await testFile(
      'test/data/hackernews.1.gather.json',
      'links to comment pages, make sure it is the comment pages, NOT the article pages',
      [
        'https://news.ycombinator.com/item?id=40716154',
        'https://news.ycombinator.com/item?id=40723024',
        'https://news.ycombinator.com/item?id=40725924',
        'https://news.ycombinator.com/item?id=40725970',
        'https://news.ycombinator.com/item?id=40726497',
        'https://news.ycombinator.com/item?id=40727252',
        'https://news.ycombinator.com/item?id=40733705',
        'https://news.ycombinator.com/item?id=40735743',
        'https://news.ycombinator.com/item?id=40736577',
        'https://news.ycombinator.com/item?id=40736771',
        'https://news.ycombinator.com/item?id=40737294',
        'https://news.ycombinator.com/item?id=40737370',
        'https://news.ycombinator.com/item?id=40738833',
        'https://news.ycombinator.com/item?id=40739384',
        'https://news.ycombinator.com/item?id=40739710',
        'https://news.ycombinator.com/item?id=40739982',
        'https://news.ycombinator.com/item?id=40740021',
        'https://news.ycombinator.com/item?id=40740237',
        'https://news.ycombinator.com/item?id=40740581',
        'https://news.ycombinator.com/item?id=40741072',
        'https://news.ycombinator.com/item?id=40741197',
        'https://news.ycombinator.com/item?id=40741672',
        'https://news.ycombinator.com/item?id=40742014',
        'https://news.ycombinator.com/item?id=40742026',
        'https://news.ycombinator.com/item?id=40742163',
        'https://news.ycombinator.com/item?id=40742764',
        'https://news.ycombinator.com/item?id=40743308',
        'https://news.ycombinator.com/item?id=40743531',
        'https://news.ycombinator.com/item?id=40743975',
        'https://news.ycombinator.com/item?id=40744162',
      ]
    );
  });

  it('should gather yc hackernews article links', async () => {
    partial = await testFile(
      'test/data/hackernews.1.gather.json',
      'links to articles',
      [
        'https://beyondloom.com/blog/dither.html',
        'https://blog.jgc.org/2024/06/two-ways-to-use-led-as-light-sensor.html',
        'https://calculatingempires.net/',
        'https://doi.org/10.1016/j.jasrep.2024.104636',
        'https://downdetector.com/status/docker/',
        'https://duckdb.org/2024/06/20/cli-data-processing-using-duckdb-as-a-unix-tool.html',
        'https://erikdemaine.org/fonts/tetris/',
        'https://gaultier.github.io/blog/write_a_video_game_from_scratch_like_1987.html',
        'https://github.com/madprops/curls',
        'https://github.com/robertdavidgraham/wc2',
        'https://jprx.io/cve-2024-27815/',
        'https://kucharski.substack.com/p/the-shape-of-information',
        'https://lwn.net/SubscriberLink/978463/608c876c1153fd31/',
        'https://news.alvaroduran.com/p/the-prototypes-language',
        'https://osrd.fr/en/',
        'https://science.nasa.gov/missions/hubble/nasa-releases-hubble-image-taken-in-new-pointing-mode/',
        'https://stackdiary.com/eu-council-has-withdrawn-the-vote-on-chat-control/',
        'https://taxfoundation.org/research/all/federal/501c3-nonprofit-organization-tax-exempt/',
        'https://www.bbc.com/news/articles/c9rrvdq3g9zo',
        'https://www.bloomberg.com/news/articles/2024-06-20/gilead-shot-prevents-100-of-hiv-cases-in-trial-of-african-women',
        'https://www.bloomberg.com/news/articles/2024-06-20/remote-work-helps-more-people-with-disabilities-get-employed',
        'https://www.engadget.com/how-small-claims-court-became-metas-customer-service-hotline-160224479.html',
        'https://www.fuzzmap.io/',
        'https://www.governor.ny.gov/news/governor-hochul-joins-attorney-general-james-and-bill-sponsors-sign-nation-leading-legislation',
        'https://www.jerpint.io/blog/diffusion-gol/',
        'https://www.octomind.dev/blog/why-we-no-longer-use-langchain-for-building-our-ai-agents',
        'https://www.rahulilango.com/coloring/',
        'https://www.ycombinator.com/companies/promoted/jobs/5moymju-sales-engineer-new-grad',
        'https://www.zdnet.com/article/suse-upgrades-its-distros-with-19-years-of-support-no-other-linux-comes-close/',
      ]
    );
  });

  it('should gather amazon soap', async () => {
    partial = await testFile(
      'test/data/amazonsoap.1.gather.json',
      'find all the links to soap product pages, and ONLY product pages, not pages for general items like best sellers',
      expectedAmazonSoap,
    );
  });

  it('should gather linkedin profiles', async () => {
    partial = await testFile(
      'test/data/linkedin.1.gather.json',
      'find links to profile pages, typically these will be names of people',
      expectedLinkedIn,
    );
  });

  it('should gather zillow listings', async () => {
    partial = await testFile(
      'test/data/zillow.1.gather.json',
      'find links to property listings. only listings to individual propeties with an address, not general links',
      [
        'https://www.zillow.com/homedetails/239-Cypress-Point-Dr-Mountain-View-CA-94043/19516531_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-183-Mountain-View-CA-94043/19516343_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-164-Mountain-View-CA-94043/19516324_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-44-Mountain-View-CA-94043/19516204_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-202-Mountain-View-CA-94043/19516362_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-155-Mountain-View-CA-94043/19516315_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-292-Mountain-View-CA-94043/19516451_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-47-Mountain-View-CA-94043/19516207_zpid/',
        'https://www.zillow.com/homedetails/505-Cypress-Point-Dr-UNIT-8-Mountain-View-CA-94043/19516168_zpid/',
      ],
    );
  });

  it('should gather redfin lsitings', async () => {
    partial = await testFile(
      'test/data/redfin.1.gather.json',
      'find links to property listings. only listings to individual propeties with an address, not general links',
      expectedRedfin,
    );
  });

  it('should gather etsy lsitings', async () => {
    partial = await testFile(
      'test/data/etsy.1.gather.json',
      'find links to product pages',
      expectedEtsy,
    );
  });


  it('should gather ebay lsitings', async () => {
    partial = await testFile(
      'test/data/ebay.1.gather.json',
      'find links to product/item pages. only find links to specific items, not general links or ge',
      expectedEbay,
    );
  });

});
