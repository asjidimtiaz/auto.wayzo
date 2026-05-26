require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function resetPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const username = 'Admin';
    const newPassword = 'Admin@2026';
    const hash = await bcrypt.hash(newPassword, 10);
    
    const existingAdmin = await pool.query(
      "SELECT id FROM admins WHERE username = $1 ORDER BY id LIMIT 1",
      [username]
    );
    const target = existingAdmin.rowCount > 0 ? existingAdmin : await pool.query(
      "SELECT id FROM admins WHERE username = 'Login' AND role = 'super_admin' ORDER BY id LIMIT 1"
    );
    const fallback = target.rowCount > 0 ? target : await pool.query(
      "SELECT id FROM admins WHERE role = 'super_admin' ORDER BY id LIMIT 1"
    );

    const result = fallback.rowCount > 0 ? await pool.query(
      "UPDATE admins SET username = $1, password = $2, role = 'super_admin', auto_ecole_id = NULL WHERE id = $3 RETURNING id, username, role",
      [username, hash, fallback.rows[0].id]
    ) : { rowCount: 0 };

    if (result.rowCount > 0) {
      console.log(`Success: Super admin reset to ${username} / ${newPassword}`);
      console.table(result.rows);
      const verify = await bcrypt.compare(
        newPassword,
        (await pool.query("SELECT password FROM admins WHERE username = $1", [username])).rows[0].password
      );
      console.log(`Password verified: ${verify}`);
    } else {
      const created = await pool.query(
        "INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, 'super_admin', NULL) RETURNING id, username, role",
        [username, hash]
      );
      console.log(`Success: Super admin created as ${username} / ${newPassword}`);
      console.table(created.rows);
    }
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    await pool.end();
  }
}

resetPassword();
