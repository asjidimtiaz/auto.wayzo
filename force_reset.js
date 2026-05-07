const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

async function forceResetAndVerify() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const username = 'login@login.com';
    const password = 'admin123';
    
    console.log('Generating hash for:', password);
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    
    await pool.query("UPDATE admins SET password = $1 WHERE username = $2", [hash, username]);
    console.log('Database updated');
    
    const result = await pool.query("SELECT password FROM admins WHERE username = $1", [username]);
    const storedHash = result.rows[0].password;
    console.log('Verified stored hash:', storedHash);
    
    const match = await bcrypt.compare(password, storedHash);
    console.log('Match immediately after update:', match);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

forceResetAndVerify();
