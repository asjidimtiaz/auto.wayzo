process.env.DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
process.env.DATABASE_SSL = "true";
const { getDb, initDb, query } = require('./src/lib/db');

async function checkAdmins() {
  try {
    await initDb();
    const admins = await query('SELECT username, role, auto_ecole_id FROM admins');
    console.log('Admins in DB:', JSON.stringify(admins, null, 2));
    
    const ecoles = await query('SELECT id, name, slug FROM auto_ecoles');
    console.log('Auto-Ecoles in DB:', JSON.stringify(ecoles, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkAdmins();
