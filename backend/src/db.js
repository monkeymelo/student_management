const { Pool } = require('pg');

let pool;

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('Missing required environment variable: DATABASE_URL. Please configure PostgreSQL connection string before starting the backend.');
  }
  return value;
}

function getPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    const shouldUseSsl = process.env.PGSSLMODE === 'disable' ? false : process.env.NODE_ENV === 'production';

    pool = new Pool({
      connectionString,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

async function query(text, params) {
  const db = getPool();
  return db.query(text, params);
}

async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function ensureDatabaseConfigured() {
  getDatabaseUrl();
}

module.exports = {
  query,
  withTransaction,
  ensureDatabaseConfigured
};
