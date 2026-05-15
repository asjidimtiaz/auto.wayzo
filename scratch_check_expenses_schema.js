require('dotenv').config();
const { Pool } = require('pg');

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expenses'
    `);
    console.log('Schema for expenses table:');
    console.table(res.rows);
    
    const sample = await pool.query("SELECT * FROM expenses LIMIT 5");
    console.log('Sample data from expenses:');
    console.table(sample.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
