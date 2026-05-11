const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

async function listAdmins() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query("SELECT id, username, email, role FROM admins");
    console.log('Admins in database:');
    console.table(result.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

listAdmins();
