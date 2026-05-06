process.env.DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
process.env.DATABASE_SSL = "true";
const { initDb } = require('./src/lib/db');

async function run() {
  console.log('Starting initDb...');
  try {
    await initDb();
    console.log('initDb COMPLETED!');
  } catch (err) {
    console.error('initDb FAILED:', err);
  } finally {
    process.exit();
  }
}

run();
