require('dotenv').config();
const { createClient } = require('@libsql/client');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

// Helper to delay
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function askGemini(prompt, retries = 3) {
  const model = "gemini-flash-lite-latest"; // Better limits on free tier
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
    }
  };

  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 429 && i < retries - 1) {
        console.log('Rate limited. Waiting 15 seconds...');
        await sleep(15000);
        continue;
      }
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      let result = data.candidates[0].content.parts[0].text.trim();
      result = result.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      return result.trim();
    }
    return "";
  }
}

async function run() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  console.log("Starting AI translation process...");
  
  const lessons = await db.execute("SELECT id, title FROM lessons WHERE title_th IS NULL OR title_th = ''");
  console.log(`Found ${lessons.rows.length} lessons to translate.`);
  for (const row of lessons.rows) {
    const prompt = `You are a professional Chinese language teacher for Thai students. Translate the following lesson title into natural Thai. Keep it concise.\nTitle: ${row.title}\nTranslate ONLY the title, no other text.`;
    try {
      const th = await askGemini(prompt);
      await db.execute({
        sql: "UPDATE lessons SET title_th = ? WHERE id = ?",
        args: [th, row.id]
      });
      console.log(`[Lesson] ${row.title} -> ${th}`);
      await sleep(4000); // 4 seconds delay for rate limit
    } catch (e) { console.error("Error on lesson", row.id, e.message); }
  }

  console.log("Translation complete!");
}

run();
