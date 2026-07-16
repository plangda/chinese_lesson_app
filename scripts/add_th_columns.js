require('dotenv').config();
const { createClient } = require('@libsql/client');

async function migrate() {
  console.log('Connecting to Turso Cloud database...');
  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log('Adding _th columns to tables in Turso...');
    
    // Add columns ignoring errors if they already exist
    const queries = [
      "ALTER TABLE vocab ADD COLUMN meaning_th TEXT;",
      "ALTER TABLE vocab ADD COLUMN deconstruct_th TEXT;",
      "ALTER TABLE vocab ADD COLUMN example_th TEXT;",
      "ALTER TABLE grammar ADD COLUMN explanation_th TEXT;",
      "ALTER TABLE grammar_examples ADD COLUMN th TEXT;",
      "ALTER TABLE dialogue_lines ADD COLUMN th TEXT;",
      "ALTER TABLE quizzes ADD COLUMN question_th TEXT;",
      "ALTER TABLE quizzes ADD COLUMN explanation_th TEXT;"
    ];

    for (let q of queries) {
      try {
        await tursoClient.execute(q);
        console.log(`Executed: ${q}`);
      } catch (err) {
        if (err.message.includes("duplicate column name")) {
          console.log(`Column already exists: ${q}`);
        } else {
          console.error(`Error executing ${q}:`, err.message);
        }
      }
    }

    console.log('✅ Columns added successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
