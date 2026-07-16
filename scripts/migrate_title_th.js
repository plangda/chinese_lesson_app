require('dotenv').config();
const { createClient } = require('@libsql/client');

async function run() {
  const tursoClient = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log("Adding title_th to lessons table...");
    await tursoClient.execute("ALTER TABLE lessons ADD COLUMN title_th TEXT;");
    console.log("Added title_th column.");
  } catch (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  }
}

run();
