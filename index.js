const axios = require('axios');
const fs = require('fs');

const URL = "https://www.perplexity.ai/rest/discover/feed";

async function fetchFeed() {
  const res = await axios.get(URL, {
    params: {
      limit: 10,
      offset: 0,
      topic: "9be812cb-6120-41b7-bc9e-993200db6cfc",
      version: "2.18",
      source: "default"
    },
    headers: {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "x-app-apiclient": "default",
    "x-app-apiversion": "2.18",
    "referer": "https://www.perplexity.ai/discover/tech",
    "origin": "https://www.perplexity.ai"
    }
  });

  return res.data;
}

function extractAnswer(item) {
  if (!item.text) return null;

  try {
    const parsed = JSON.parse(item.text);
    return parsed.answer || null;
  } catch {
    return null;
  }
}

function cleanText(text) {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\\n/g, '\n')
    .trim();
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync('data.json'));
  } catch {
    return [];
  }
}

function saveData(data) {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

(async () => {
  const existing = loadExisting();
  const existingSlugs = new Set(existing.map(x => x.slug));

  const raw = await fetchFeed();

  const fresh = raw.map(item => {
    const answer = extractAnswer(item);
    if (!answer) return null;

    return {
      title: item.title,
      summary: cleanText(answer).slice(0, 300),
      url: `https://www.perplexity.ai/${item.slug}`,
      slug: item.slug,
      date: item.published_timestamp
    };
  }).filter(Boolean);

  // Only new items
  const newItems = fresh.filter(x => !existingSlugs.has(x.slug));

  // Merge + keep latest 20
  const updated = [...newItems, ...existing].slice(0, 20);

  saveData(updated);

  console.log("Updated:", newItems.length, "new items");
})();