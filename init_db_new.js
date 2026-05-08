require('dotenv').config();
const { initDb } = require('./src/lib/db');

async function run() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
  console.log('Starting Database Initialization...');
  try {
    await initDb();
    console.log('✅ Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  } finally {
    process.exit();
  }
}

run();
