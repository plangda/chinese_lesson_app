require('dotenv').config();
const { createClient } = require('@libsql/client');

async function translateText(text) {
  if (!text) return text;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // The google API returns an array where data[0] is an array of segments
    let translated = '';
    if (data && data[0]) {
      for (const segment of data[0]) {
        if (segment[0]) translated += segment[0];
      }
    }
    return translated || text;
  } catch (err) {
    console.error('Translation error:', err);
    return text;
  }
}

// Pause helper to avoid rate limits
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  console.log('Translating vocab...');
  let rs = await tursoClient.execute('SELECT id, meaning, deconstruct, example_en FROM vocab WHERE meaning_th IS NULL LIMIT 200'); // chunk
  for (const row of rs.rows) {
    console.log(`Translating vocab ID ${row.id}: ${row.meaning}`);
    const meaning_th = await translateText(row.meaning);
    const deconstruct_th = await translateText(row.deconstruct);
    const example_th = await translateText(row.example_en);
    
    await tursoClient.execute({
      sql: 'UPDATE vocab SET meaning_th = ?, deconstruct_th = ?, example_th = ? WHERE id = ?',
      args: [meaning_th, deconstruct_th, example_th, row.id]
    });
    await sleep(200); // polite delay
  }

  console.log('Translating grammar...');
  rs = await tursoClient.execute('SELECT id, explanation FROM grammar WHERE explanation_th IS NULL LIMIT 100');
  for (const row of rs.rows) {
    console.log(`Translating grammar ID ${row.id}`);
    const explanation_th = await translateText(row.explanation);
    
    await tursoClient.execute({
      sql: 'UPDATE grammar SET explanation_th = ? WHERE id = ?',
      args: [explanation_th, row.id]
    });
    await sleep(200);
  }

  console.log('Translating grammar_examples...');
  rs = await tursoClient.execute('SELECT id, en FROM grammar_examples WHERE th IS NULL LIMIT 200');
  for (const row of rs.rows) {
    console.log(`Translating grammar_example ID ${row.id}`);
    const th = await translateText(row.en);
    
    await tursoClient.execute({
      sql: 'UPDATE grammar_examples SET th = ? WHERE id = ?',
      args: [th, row.id]
    });
    await sleep(200);
  }

  console.log('Translating dialogue_lines...');
  rs = await tursoClient.execute('SELECT id, en FROM dialogue_lines WHERE th IS NULL LIMIT 200');
  for (const row of rs.rows) {
    console.log(`Translating dialogue_line ID ${row.id}`);
    const th = await translateText(row.en);
    
    await tursoClient.execute({
      sql: 'UPDATE dialogue_lines SET th = ? WHERE id = ?',
      args: [th, row.id]
    });
    await sleep(200);
  }

  console.log('Translating quizzes...');
  rs = await tursoClient.execute('SELECT id, question, explanation FROM quizzes WHERE question_th IS NULL LIMIT 200');
  for (const row of rs.rows) {
    console.log(`Translating quiz ID ${row.id}`);
    const question_th = await translateText(row.question);
    const explanation_th = await translateText(row.explanation);
    
    await tursoClient.execute({
      sql: 'UPDATE quizzes SET question_th = ?, explanation_th = ? WHERE id = ?',
      args: [question_th, explanation_th, row.id]
    });
    await sleep(200);
  }

  console.log('✅ Translation script finished (first batch)! Run again if there are more rows.');
}

run();
