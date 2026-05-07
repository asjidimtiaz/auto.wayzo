const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

async function verifyLogin() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const username = 'login@login.com';
    const password = 'admin123';
    
    const result = await pool.query("SELECT * FROM admins WHERE username = $1", [username]);
    if (result.rowCount === 0) {
      console.log('User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', user.username);
    console.log('Stored Hash:', user.password);
    
    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);
    
    // Also try the pattern I suggested: username123
    const matchPattern = await bcrypt.compare(username + '123', user.password);
    console.log('Password match (pattern login@login.com123):', matchPattern);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

verifyLogin();
