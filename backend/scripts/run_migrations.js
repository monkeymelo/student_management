const fs = require('fs');
const path = require('path');
const { withTransaction, ensureDatabaseConfigured } = require('../src/db');

async function runMigrations() {
  ensureDatabaseConfigured();
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  await withTransaction(async (client) => {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`Applied migration: ${file}`);
    }
  });

  console.log('All migrations applied successfully.');
}

runMigrations().catch((error) => {
  console.error('Failed to run migrations:', error.message);
  process.exit(1);
});
