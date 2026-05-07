const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Using your database URL from the check_db.js
const DATABASE_URL = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

async function resetPassword() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const newPassword = 'admin123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      "UPDATE admins SET password = $1 WHERE username = $2 RETURNING id",
      [hash, 'login@login.com']
    );

    if (result.rowCount > 0) {
      console.log('Success: Password for login@login.com has been reset to: ' + newPassword);
    } else {
      console.log('Error: User login@login.com not found in the database.');
    }
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    await pool.end();
  }
}

resetPassword();
