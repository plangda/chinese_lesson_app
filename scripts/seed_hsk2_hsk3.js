const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function seedLevel(levelName, dataPath) {
  console.log(`Seeding ${levelName}...`);
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  const CHUNK_SIZE = 20;
  let dayNum = 1;
  let wordsProcessed = 0;
  
  while (wordsProcessed < data.length) {
    const chunk = data.slice(wordsProcessed, wordsProcessed + CHUNK_SIZE);
    
    const lessonId = `${levelName}_day${dayNum}`;
    const lessonTitle = `Day ${dayNum}: Vocabulary Practice`;
    
    // Insert Lesson
    await client.execute({
      sql: 'INSERT INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)',
      args: [lessonId, levelName, dayNum, lessonTitle, 20]
    });
    
    // Insert Vocab
    for (let i = 0; i < chunk.length; i++) {
      const v = chunk[i];
      const pinyin = v.forms[0].transcriptions.pinyin;
      const meaning = v.forms[0].meanings.join(', ');
      
      await client.execute({
        sql: 'INSERT INTO vocab (lesson_id, character, pinyin, meaning, sort_order) VALUES (?, ?, ?, ?, ?)',
        args: [lessonId, v.simplified, pinyin, meaning, i]
      });
    }
    
    // Insert Mock Grammar
    await client.execute({
      sql: 'INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)',
      args: [lessonId, 'Grammar Point 1', `This is a placeholder grammar point for ${lessonTitle}.`, 0]
    });
    await client.execute({
      sql: 'INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)',
      args: [lessonId, 'Grammar Point 2', 'This is another placeholder grammar point.', 1]
    });
    
    // Insert Mock Dialogue
    const dRes = await client.execute({
      sql: 'INSERT INTO dialogues (lesson_id, title) VALUES (?, ?)',
      args: [lessonId, "Practice Dialogue"]
    });
    
    const dialogueId = Number(dRes.lastInsertRowid);
    
    await client.execute({
      sql: 'INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [dialogueId, 'A', '你好', 'nǐ hǎo', 'Hello', 0]
    });
    await client.execute({
      sql: 'INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      args: [dialogueId, 'B', '你好', 'nǐ hǎo', 'Hello', 1]
    });
    
    dayNum++;
    wordsProcessed += CHUNK_SIZE;
  }
  console.log(`Successfully seeded ${levelName}: ${dayNum - 1} lessons, ${data.length} words.`);
}

async function run() {
  try {
    await seedLevel('hsk2', path.join(__dirname, '../data/hsk2.json'));
    await seedLevel('hsk3', path.join(__dirname, '../data/hsk3.json'));
    console.log("All seeding completed successfully!");
  } catch(e) {
    console.error(e);
  }
}
run();
