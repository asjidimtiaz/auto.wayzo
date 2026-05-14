require('dotenv').config();
const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admins'
    `);
    console.log('Schema for admins table:');
    console.table(result.rows);
    
    const users = await pool.query("SELECT * FROM admins LIMIT 5");
    console.log('Sample data from admins:');
    console.table(users.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
