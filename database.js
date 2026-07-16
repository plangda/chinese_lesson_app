require('dotenv').config();
const { createClient } = require('@libsql/client');

let client;
async function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  
  // Return a wrapper that mimics the sqlite / sqlite3 API
  return {
    all: async (sql, args) => {
      const rs = await client.execute({ sql, args: args || [] });
      return rs.rows;
    },
    get: async (sql, args) => {
      const rs = await client.execute({ sql, args: args || [] });
      return rs.rows[0] || null;
    },
    run: async (sql, args) => {
      return await client.execute({ sql, args: args || [] });
    },
    exec: async (sql) => {
      return await client.executeMultiple(sql);
    }
  };
}

module.exports = { getDb };
