require('dotenv').config();
const { Pool } = require('pg');

async function listAdmins() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query("SELECT id, username, role, auto_ecole_id FROM admins ORDER BY id");
    console.log('Admins in database:');
    console.table(result.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

listAdmins();
