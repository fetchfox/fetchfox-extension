export const getTemplate = (name) => {
  return {
    genJob: genJobTemplate,
    genJob2: genJob2Template,
    gather: gatherTemplate,
    scrape: scrapeTemplate,
    name: nameTemplate,
    checkLoading: checkLoadingTemplate,
  }[name];
}

export const genJobTemplate = `You are part of a web scraping program, and your job is to take a "master prompt" from the user, and generate the JSON job definition for the web scrape.

The web scrape job you are generating starts at a target page which the user provides, and it navigates 1 link away from that target page to detail pages. On the detail pages, the job extracts 1 item per detail page.

For the job definition, you will need to output the following fields:

- itemSummary: This tells the job what items we are looking for. It is based on the master prompt. These items may be present on the starting page, or they may be present on pages linked from the starting page. Be specific.

- gatherPrompt: This is based on itemSummary, and it gives a little more detail. It describes how to find items on a page, and what to ignore. Exclusions are important to clear up confusion.

- detailFields: This is a list of detail prompts for data extraction for each item. It is also based on the master prompt. Each detail prompt corresponds to an output field on the item.

Here is an example input and output:

Example input: Scrape https://www.nytimes.com for articles. Find author, title, date, key people, and 2-5 word summary

Example output 1:
{
  itemSummary: "News articles",
  gatherPrompt: "Find news articles. Only find news articles. Exclude general  that match specific articles, not general pages. Avoid advertisements and general category links.",
  detailFields: [
    "Who is the author of this article?",
    "What is the title of this article?",
    "What is the date of this article? Format: YYYY-MM-DD",
    "List the key people in this article",
    "Give a 2-5 word summary of this article."
  ]
}

Example output 2:
{
  itemSummary: "Biographies",
  gatherPrompt: "Find links to pages about individual people. Only pages that match specific people, not general pages.",
  detailFields: [
    "Who is this page about? Give the name",
    "Where was this person born?",
    "When was this person born? Format: YYYY-MM-DD",
    "List a 5-10 word summary of their key accomplishments"
  ]
}

Example output 3:
{
  itemSummary: "Software engineers",
  gatherPrompt: "Find links to employees for hiring software engineers. Ignore site navigation links.",
  detailFields: [
    "Name of the person",
    "Most recent job experience, format: Company Name, Title, Start Date-End Date",
    "Key skills, including programming languages. Exclude fluff.",
    "University and degree, or N/A if none"
  ]
}

Follow this guidance:

- If the prompt is ambiguous, take your best guess at the likely fields. Output a JSON object of the results.
- Important: try to figure out unique aspects of the site, and focus on those
- Only output a JSON object, and make sure it is parseable.
- The user can delete fields he doesn't want, so err on the side of giving too many fields, typically in the range of 2-5.
- Specify the format if necessary: dates, say the date format. For numbers, specify the output should be a number. For emails, request deobfuscation. For subjective or text fields, give a reasonable word limit, usually no more than 20 words
- If reasonable, tailor the fields to the distinct qualities of the targe site

Below is the information from the user and website. Prompt directive lines are preceded by >>>>

>>>> The master prompt is below:
Scrape {{url}} for {{prompt}}

>>>> To help, here is the innerText from the page:
{{text}}

>>>> HTML text from innerHTML of the page (first {{count}} characters):
{{html}}
`;

export const genJob2Template = `You are part of a web scraping program, and your job is to take a "master prompt" from the user, and generate the JSON job definition for the web scrape.

You will receive a prompt from the user, describing what they wish to scrape.

You will also receive information about the starting page of the scrape, including its URL, HTML, and text.

You will return a JSON object with the following fields, in this order:

- "intentAnalysis": A 10-30 word summary of the user's likely intent, given the user prompt and the page information.

- "itemDescription": A 2-5 word description of the items the user is trying to scrape. Try to infer the general item based on the intent.

- "detailFields": An array defining the field(s) the user is looking for, based on "intentAnalysis" and the prompt. IF THERE IS A PROMPT GIVEN, base this off the prompt.
- For "detailFields", follow these guidelines:
  - For URLs and links, that detail field SHOULD SPECIFY absolute URL format

- "dataAvailability": For each item in "detailFields", say whether it is likely present on the current page ("currentPage"), or a page LINKED from the current page ("linkedPage")

- "scrapeTypeGuess": Either "singlePage" or "multiPage". Respond with "singlePage" if the current page has all the items, and all the DETAILS the user wants to scrape. Respond with "multiPage" if these items are LINKED from the current page, and the LINKED pages are needed to get ALL the details the user is looking for. This is your first guess, which you will have a chance to revise.

- "scrapeTypeReason": Explain in 5-15 words why you made your guess in "scrapeTypeGuess".

- "scrapeType": Your FINAL answer for the scrape type, either "singlePage" or "multiPage". Change only if you need to after thinking about it in "scrapeTypeReason"

- "gatherPrompt": If this is "singlePage", return "". If this is "multiPage", describe how to find the linked pages that contain all the detail fields. Exclusions are important to clear up confusion.

{{extraRules}}

Example output 1:
{
  "intentAnalysis": "The user is likely looking for ratings and information about products to evaluate which one to buy",
  "itemDescription": "Product reviews and information",
  "detailFields": [
    "What is the name of this product?",
    "What is the rating of this product? Format: X.X/X",
    "Who made this product?",
    "What is the URL of this product? Format: full absolute URL",
    "What is the price of this product? Format: $XX.XX"
  ],
  "dataAvailability": {
    "What is the name of this product?": "currentPage",
    "What is the rating of this product? Format: X.X/X": "linkedPage",
    "Who made this product?": "currentPage",
    "What is the price of this product? Format: $XX.XX": "linkedPage"
  },
  "scrapeTypeGuess": "multiPage",
  "scrapeTypeReason": "The product rating and price are only available on the indivdiual pages",
  "scrapeType": "multiPage",
  "gatherPrompt": "Find links to products. Ignore category links, page navigation, and advertisements"
}

Example output 2:
{
  "intentAnalysis": "The user wants to find candidates for a job based on the results from a search page",
  "itemDescription": "Job applicant candidates",
  "detailFields": [
    "What is the name of this person?",
    "What is this person's current employer?",
    "What is this peerson's current job title?",
    "What is the full URL of their profile?"
  ],
  "dataAvailability": {
    "What is the name of this person?": "currentPage",
    "What is this person's current employer?": "currentPage",
    "What is this peerson's current job title?": "currentPage",
    "What is the full URL of their profile?": "currentPage"
  },
  "scrapeTypeGuess": "singlePage",
  "scrapeTypeReason": "All the data is available on the current page, so I don't need to load extra pages",
  "scrapeType": "singlePage",
  "gatherPrompt": ""
}

Page URL: {{url}}

Page HTML: {{html}}

Page text: {{text}}

User prompt: {{prompt}}

You MUST respond with ONLY the JSON object, no comments, no explanation. Otherwise you fail the task.

`;

export const gatherTemplate = `You are part of a web crawling program, and your goal is to pick out relevant links in a list. The list contains the inner text of links, and also their URLs. You will take this list, look for links that match the user prompt, and generate a new list of only the matching items.

Your response will be ONLY the "id" field of matching items. The "id" field will be used to generate the results later, you only need to include the "id" field.

Follow these important rules:
- The entire array should be JSON array
- Do not wrap the response in an array, individual dictionaries only.
- Do not include any markdown formatting. Only include JSON.
- Respond with [] if nothing matches the prompt.
- Generally avoid links with no link text.
- Find all the matches, and err on the side of overmatching, especially if the user prompt is short

Follow these site specific rules:
- For amazon.com, product links have the product name in the link text. For amazon.com, ONLY include proudcts where the link text has the product name.

Example of valid output:
[
  { "id": 3 },
  { "id": 18 },
  { "id": 45 }
]

The user is looking for: {{question}}

The list to find this is below:
{{list}}
`;

export const scrapeTemplate = `You are a web scraping extraction program. You will receive webpage content including text and HTML from a web page. Your goal is to extract one or more items matching a user's prompt. You will first count how many items are on the page, and then extract and list each item. The page will either contain a single item, or multiple similar items that are similar. 

If you're unable to answer a question fill in the value "(not found)", but make your best guess. Prefer to give an answer if one seems plausible.

Your response will be parsed by a computer program, so respond ONLY with valid JSONL. Each line must be parseable JSON.

The first JSON object your return will have one field, "itemCount", indicating how many items are to come.

The remaining JSON objects you returns will be items. There will be one item per line. Each field in these objects corresponds to the questions.

Follow these important rules:
- Please make sure the response is valid JSONL. Only ONE JSON object per line. Remove any \n characters in questions and answers.
- Use the SAME keys for each item as you find in the questions dictionary.
- Do NOT fix spelling errors in the item keys. If the questions contain typos, spelling errors, or other mistakes, keep those in the item dictionary keys.

{{extraRules}}

Example of a valid response with multiple items:
{"itemCount": 2}
{"What is the author's name?": "Ernest Hemingway", "What is the book's name?": "The Old Man and the Sea"}
{"What is the author's name?": "George Orwell", "What is the book's name?": "1984"}

Example of a valid response with a single item:
{"itemCount": 1}
{"What is the article's title?": "New Find at the Great Wall of China", "What is the article's date in YYYY-MM-DD format?": "2024-02-04"}

Below is the user prompts. Prompt directive lines are preceded by >>>>

>>>> {{itemDescription}}

>>>> {{perPageCopy}}

>>>> Below are the questions for each item(s):

{{questions}}

>>>> The URL of the website:
{{url}}

>>>> Raw text from innerText of the page:
{{text}}

>>>> HTML text from innerHTML of the page (first {{count}} characters):
{{html}}
`;

export const nameTemplate = `Below is the JSON definition of a web scraping job. Your task is to summarize this job in no more than 30 characters. The summary should be user friendly, intended for a human power user. It shoudl highlight the unique aspects of the job, such as the scraping target, and the type of information being extracted. Ideally your summary will be between 2 to 5 words, and never more than 40 characters.

Follow these directives:
- Respoind with valid JSON, with the 'name' field representing your answer. Only give JSON, no explanation or markup. Your response will be parsed using JSON.parse()
- Do not include words like "Scrape", "Extract", "Collect", "Monitor", etc. in the answer, since that is implied based on context. The response should be a noun-phrase.
- Prepend the domain to the summary, for example if the url is https://www.cnn.com/politics, prepend "cnn.com - " to the summary you come up with. Do NOT include "www" subdomain. Include other subdomains if they are informative.

Example of valid response:

{ name: "site.com - Article author and name" }

The job definition, in JSON, is:

{{job}}`;

export const checkLoadingTemplate = `Below is text and HTML from a webpage. Your job is to check if the main content on the page is loaded, or if it is not yet available do to dynamic requests like ajax and other async dynamic content. The main content is information relevant to the user's questions, which are show below.

Follow these guidelines:
- If the main content of the page is missing, reply "loading"
- If the main content is available, reply "done"
- If the main content is available but small parts are loading, reply "done"
- Your response MUST be valid json, with the key "status" and either "loading" or "done" as the value
- Summarize the main contnet of the page in 2-10 words before deciding if it is loaded

Example of valid responses:

{ contentSummary: "user profile page with emails", status: "loading" }
{ contentSummary: "real estate listing page with price history", status: "done" }

Below is the user's questions:

{{questions}}

Below is the text from the page:

{{text}}

Below is the HTML from the page:

{{html}}
`;
