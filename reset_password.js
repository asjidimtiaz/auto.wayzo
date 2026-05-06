const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function reset() {
  const connectionString = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const newPass = 'admin123';
    const hash = await bcrypt.hash(newPass, 10);
    
    await client.query('UPDATE admins SET password = $1 WHERE username = $2', [hash, 'login@login.com']);
    console.log('PASSWORD RESET SUCCESSFUL!');
    console.log('Username: login@login.com');
    console.log('New Password: ' + newPass);
    
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

reset();
