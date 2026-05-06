const { Client } = require('pg');

async function check() {
  const connectionString = "postgresql://postgres.opjvehvtazkwnptcsevc:pVA%24GwWAVaab9MW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!');
    
    const resAdmins = await client.query('SELECT username, role FROM admins');
    console.log('ADMINS:', JSON.stringify(resAdmins.rows, null, 2));
    
    const resEcoles = await client.query('SELECT id, name, slug FROM auto_ecoles');
    console.log('ECOLES:', JSON.stringify(resEcoles.rows, null, 2));
    
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await client.end();
  }
}

check();
