const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  console.log("Cleaning up mock HSK 2 and HSK 3 lessons...");
  
  await client.executeMultiple(`
    DELETE FROM vocab WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3'));
    DELETE FROM grammar_practice WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3')));
    DELETE FROM grammar_examples WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3')));
    DELETE FROM grammar WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3'));
    DELETE FROM dialogue_lines WHERE dialogue_id IN (SELECT id FROM dialogues WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3')));
    DELETE FROM dialogues WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3'));
    DELETE FROM quizzes WHERE lesson_id IN (SELECT id FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3'));
    DELETE FROM lessons WHERE hsk_level IN ('hsk2', 'hsk3');
  `);
  
  console.log("Cleanup complete!");
}
run().catch(console.error);
