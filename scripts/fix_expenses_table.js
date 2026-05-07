const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Fixing expenses table schema...');
    
    // Drop the old UUID-based table if it exists
    await client.query(`DROP TABLE IF EXISTS expenses`);
    
    // Create new table with SERIAL id and INT tenant_id to match auto_ecoles(id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        tenant_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        subcategory VARCHAR(255),
        amount DECIMAL(12, 2) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);
    console.log('Expenses table schema fixed successfully.');
  } catch (err) {
    console.error('Error fixing table:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
