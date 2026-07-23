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
  
  // Retry helper
  async function executeWithRetry(fn, retries = 3, delay = 500) {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) throw err;
      await new Promise(res => setTimeout(res, delay));
      return executeWithRetry(fn, retries - 1, delay * 2);
    }
  }

  // Return a wrapper that mimics the sqlite / sqlite3 API
  return {
    all: async (sql, args) => {
      const rs = await executeWithRetry(() => client.execute({ sql, args: args || [] }));
      return rs.rows;
    },
    get: async (sql, args) => {
      const rs = await executeWithRetry(() => client.execute({ sql, args: args || [] }));
      return rs.rows[0] || null;
    },
    run: async (sql, args) => {
      return await executeWithRetry(() => client.execute({ sql, args: args || [] }));
    },
    exec: async (sql) => {
      return await executeWithRetry(() => client.executeMultiple(sql));
    },
    transaction: async () => {
      const tx = await client.transaction("write");
      return {
        all: async (sql, args) => {
          const rs = await tx.execute({ sql, args: args || [] });
          return rs.rows;
        },
        get: async (sql, args) => {
          const rs = await tx.execute({ sql, args: args || [] });
          return rs.rows[0] || null;
        },
        run: async (sql, args) => {
          return await tx.execute({ sql, args: args || [] });
        },
        commit: async () => {
          await tx.commit();
        },
        rollback: async () => {
          await tx.rollback();
        }
      };
    }
  };
}

module.exports = { getDb };
