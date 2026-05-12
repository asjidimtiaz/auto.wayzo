const { Pool, types } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Parse dates as strings (not JS Date objects)
types.setTypeParser(1082, (val) => val);
types.setTypeParser(1114, (val) => val);
types.setTypeParser(1184, (val) => val);
types.setTypeParser(1700, (val) => parseFloat(val));

let pool = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  const ssl = process.env.DATABASE_SSL !== 'false' && { rejectUnauthorized: false };
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: 10,
  });
  return pool;
}

async function getDb() {
  return getPool();
}

async function query(sql, params = []) {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params = []) {
  const p = getPool();
  return await p.query(sql, params);
}

async function withTransaction(fn) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── DB INIT ────────────────────────────────────────────────────────────────

async function initDb() {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS auto_ecoles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'role') THEN
        ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'admin';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'auto_ecole_id') THEN
        ALTER TABLE admins ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
      END IF;
    END $$
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      license_type VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      qr_code VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      cin VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      license_type VARCHAR(50) NOT NULL,
      registration_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'En formation',
      training_start_date DATE,
      training_duration_days INT DEFAULT 30,
      license_obtained BOOLEAN DEFAULT false,
      license_obtained_type VARCHAR(50),
      license_obtained_date DATE,
      offer_id INT REFERENCES offers(id) ON DELETE SET NULL,
      total_price DECIMAL(10,2) DEFAULT 0,
      interested_licenses VARCHAR(255),
      reminder_date DATE,
      internal_notes TEXT,
      payment_type VARCHAR(50) DEFAULT 'full',
      profile_image VARCHAR(500),
      cin_document VARCHAR(500),
      birth_place VARCHAR(255),
      birth_date DATE,
      web_reference VARCHAR(255),
      ville VARCHAR(100),
      autre_ville VARCHAR(100),
      email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'email') THEN
        ALTER TABLE students ADD COLUMN email VARCHAR(255);
      END IF;
    END $$
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      time_in VARCHAR(10),
      time_out VARCHAR(10),
      status VARCHAR(50) DEFAULT 'Présent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      payment_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT UNIQUE NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      school_name VARCHAR(255) DEFAULT 'Auto-École',
      address TEXT,
      phone VARCHAR(50),
      gsm VARCHAR(50),
      email VARCHAR(255),
      fax VARCHAR(50),
      city VARCHAR(100),
      default_training_days INT DEFAULT 30,
      license_number VARCHAR(100),
      tax_register VARCHAR(100),
      commercial_register VARCHAR(100),
      tp VARCHAR(100),
      cnss VARCHAR(100),
      ice VARCHAR(100),
      capital VARCHAR(100),
      web_reference VARCHAR(255),
      logo TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS payment_schedules (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      installment_number INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      due_date DATE NOT NULL,
      paid BOOLEAN DEFAULT false,
      paid_date DATE,
      payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS stages (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      scheduled_date DATE NOT NULL,
      scheduled_time VARCHAR(10),
      duration_minutes INT DEFAULT 60,
      status VARCHAR(50) DEFAULT 'Planifié',
      result TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      invoice_number VARCHAR(100) NOT NULL,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'Émise',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50),
      file_size INT,
      description TEXT,
      file_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL DEFAULT 'Avertissement',
      description TEXT NOT NULL,
      date DATE NOT NULL,
      resolved BOOLEAN DEFAULT false,
      resolved_date DATE,
      resolved_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      subcategory VARCHAR(100),
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations for existing tables
  const tables = ['offers', 'students', 'attendance', 'payments', 'payment_schedules', 'stages', 'invoices', 'documents', 'incidents'];
  for (const t of tables) {
    await p.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'auto_ecole_id') THEN
          ALTER TABLE ${t} ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_content') THEN
        ALTER TABLE documents ADD COLUMN file_content TEXT;
      END IF;
    END $$
  `);

  await p.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'student_id' AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE documents ALTER COLUMN student_id DROP NOT NULL;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'auto_ecole_id' AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE documents ALTER COLUMN auto_ecole_id DROP NOT NULL;
      END IF;
    END $$
  `);

  await p.query(`
    ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS gsm VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tp VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cnss VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ice VARCHAR(100),
      ADD COLUMN IF NOT EXISTS capital VARCHAR(100)
  `);

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'auto_ecole_id') THEN
        ALTER TABLE settings ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
        ALTER TABLE settings ADD PRIMARY KEY (id);
      END IF;
    END $$
  `);

  await p.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT');

  await p.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_auto_ecole_id_key'
      ) THEN
        DELETE FROM settings s1 USING settings s2
        WHERE s1.auto_ecole_id = s2.auto_ecole_id AND s1.id > s2.id;
        ALTER TABLE settings ADD CONSTRAINT settings_auto_ecole_id_key UNIQUE (auto_ecole_id);
      END IF;
    END $$
  `);

  // Triggers
  await p.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  for (const [tbl] of [['students'], ['settings'], ['auto_ecoles']]) {
    await p.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_${tbl}_updated_at') THEN
          CREATE TRIGGER update_${tbl}_updated_at BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$
    `);
  }

  // Seed default auto_ecole
  const countAe = parseInt((await p.query('SELECT COUNT(*) as count FROM auto_ecoles')).rows[0].count);
  if (countAe === 0) {
    await p.query("INSERT INTO auto_ecoles (name, slug) VALUES ('Auto-École Maroc', 'auto-ecole-maroc')");
  }

  // Seed default settings
  const countSettings = parseInt((await p.query('SELECT COUNT(*) as count FROM settings')).rows[0].count);
  if (countSettings === 0) {
    const firstAe = await queryOne('SELECT id FROM auto_ecoles ORDER BY id LIMIT 1');
    if (firstAe) {
      await p.query("INSERT INTO settings (auto_ecole_id, school_name) VALUES ($1, 'Auto-École Maroc')", [firstAe.id]);
    }
  }

  // Seed default super admin
  const bcrypt = require('bcryptjs');
  const countAdmins = parseInt((await p.query('SELECT COUNT(*) as count FROM admins')).rows[0].count);
  if (countAdmins === 0) {
    const hash = await bcrypt.hash('Login@2026', 10);
    await p.query(
      "INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, $3, NULL)",
      ['Login', hash, 'super_admin']
    );
  }

  await p.query("UPDATE admins SET role = 'super_admin' WHERE username = 'admin' AND (role IS NULL OR role = 'admin') AND auto_ecole_id IS NULL");

  // Backfill auto_ecole_id
  const firstAe = await queryOne('SELECT id FROM auto_ecoles ORDER BY id LIMIT 1');
  if (firstAe) {
    for (const t of tables) {
      await p.query(`UPDATE ${t} SET auto_ecole_id = $1 WHERE auto_ecole_id IS NULL`, [firstAe.id]);
    }
    await p.query('UPDATE settings SET auto_ecole_id = $1 WHERE auto_ecole_id IS NULL', [firstAe.id]);
  }

  // Indexes
  for (const t of tables) {
    await p.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_${t}_auto_ecole') THEN
          CREATE INDEX idx_${t}_auto_ecole ON ${t}(auto_ecole_id);
        END IF;
      END $$
    `);
  }

  await p.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_number_key') THEN
        ALTER TABLE invoices DROP CONSTRAINT invoices_invoice_number_key;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_auto_ecole_invoice_number_key') THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_auto_ecole_invoice_number_key UNIQUE (auto_ecole_id, invoice_number);
      END IF;
    END $$
  `);

  await p.query(`
    ALTER TABLE students
      ADD COLUMN IF NOT EXISTS ville VARCHAR(100),
      ADD COLUMN IF NOT EXISTS autre_ville VARCHAR(100)
  `);

  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_stages_date_status ON stages(scheduled_date, status);
    CREATE INDEX IF NOT EXISTS idx_payment_schedules_due ON payment_schedules(due_date, paid);
    CREATE INDEX IF NOT EXISTS idx_students_reminder ON students(reminder_date);
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
  `);
}

// ─── AUTO ECOLES ────────────────────────────────────────────────────────────

async function getAllAutoEcoles() {
  return query(`
    SELECT ae.*,
      (SELECT COUNT(*) FROM students WHERE auto_ecole_id = ae.id) as student_count,
      (SELECT COUNT(*) FROM admins WHERE auto_ecole_id = ae.id) as admin_count,
      (SELECT username FROM admins WHERE auto_ecole_id = ae.id ORDER BY id LIMIT 1) as admin_username
    FROM auto_ecoles ae ORDER BY ae.created_at DESC
  `);
}

async function getAutoEcoleById(id) {
  return queryOne('SELECT * FROM auto_ecoles WHERE id = $1', [id]);
}

async function getAutoEcoleBySlug(slug) {
  return queryOne('SELECT * FROM auto_ecoles WHERE slug = $1', [slug]);
}

async function createAutoEcole(data) {
  const row = await queryOne('INSERT INTO auto_ecoles (name, slug) VALUES ($1, $2) RETURNING id', [data.name, data.slug]);
  return { id: row.id };
}

async function updateAutoEcole(id, data) {
  return execute('UPDATE auto_ecoles SET name = $1, slug = $2, active = $3 WHERE id = $4', [
    data.name, data.slug, data.active !== false, id,
  ]);
}

async function deleteAutoEcole(id) {
  return execute('DELETE FROM auto_ecoles WHERE id = $1', [id]);
}

// ─── ADMINS ─────────────────────────────────────────────────────────────────

async function getAdminsByAutoEcole(autoEcoleId) {
  return query('SELECT id, username, role, auto_ecole_id, created_at FROM admins WHERE auto_ecole_id = $1', [autoEcoleId]);
}

async function createTenantAdmin(autoEcoleId, username, password) {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(password, 10);
  const row = await queryOne(
    'INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [username, hash, 'admin', autoEcoleId]
  );
  return { id: row.id };
}

async function updateTenantAdminPassword(id, password) {
  const bcrypt = require('bcryptjs');
  return execute('UPDATE admins SET password = $1 WHERE id = $2', [await bcrypt.hash(password, 10), id]);
}

async function deleteTenantAdmin(id) {
  return execute("DELETE FROM admins WHERE id = $1 AND role = 'admin'", [id]);
}

async function getAdminByUsername(username) {
  return queryOne(`
    SELECT a.*, ae.slug
    FROM admins a
    LEFT JOIN auto_ecoles ae ON a.auto_ecole_id = ae.id
    WHERE a.username = $1
  `, [username]);
}

// ─── STUDENTS ───────────────────────────────────────────────────────────────

async function getAllStudents(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const limitClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT s.*, o.name as offer_name, o.price as offer_price,
      COALESCE(p.paid_amount, 0) as paid_amount,
      CASE WHEN s.total_price = 0 AND o.price IS NOT NULL THEN o.price ELSE s.total_price END as total_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    LEFT JOIN (SELECT student_id, SUM(amount) as paid_amount FROM payments GROUP BY student_id) p ON p.student_id = s.id
    WHERE s.auto_ecole_id = $1
    ORDER BY s.created_at DESC
    ${limitClause}
  `, [autoEcoleId]);
}

async function getStudentById(id, autoEcoleId) {
  const student = await queryOne(`
    SELECT s.*, o.name as offer_name, o.price as offer_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    WHERE s.id = $1 AND s.auto_ecole_id = $2
  `, [id, autoEcoleId]);

  if (student) {
    student.payments = await getPaymentsByStudent(id, autoEcoleId);
    student.attendance = await getAttendanceByStudent(id, autoEcoleId);
    student.paid_amount = student.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    if ((student.total_price === null || student.total_price === undefined) && student.offer_price != null) {
      student.total_price = student.offer_price;
    }
  }
  return student;
}

async function createStudent(autoEcoleId, data) {
  const qrCode = `STU-${uuidv4().substring(0, 8).toUpperCase()}`;
  const row = await queryOne(`
    INSERT INTO students (auto_ecole_id, qr_code, full_name, cin, phone, address, license_type,
      registration_date, status, training_start_date, training_duration_days,
      offer_id, total_price, interested_licenses, reminder_date, internal_notes,
      profile_image, cin_document, birth_place, birth_date, ville, autre_ville, email)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING id
  `, [
    autoEcoleId, qrCode, data.full_name, data.cin || null, data.phone || null,
    data.address || null, data.license_type, data.registration_date,
    data.status || 'En formation', data.training_start_date || data.registration_date,
    data.training_duration_days || 30, data.offer_id || null, data.total_price || 0,
    data.interested_licenses || null, data.reminder_date || null, data.internal_notes || null,
    data.profile_image || null, data.cin_document || null, data.birth_place || null,
    data.birth_date || null, data.ville || null, data.autre_ville || null, data.email || null,
  ]);
  return { id: row.id, qr_code: qrCode };
}

async function updateStudent(id, autoEcoleId, data) {
  return execute(`
    UPDATE students SET
      full_name = $1, cin = $2, phone = $3, address = $4, license_type = $5,
      registration_date = $6, status = $7, training_start_date = $8, training_duration_days = $9,
      offer_id = $10, total_price = $11, interested_licenses = $12,
      reminder_date = $13, internal_notes = $14,
      birth_place = $15, birth_date = $16,
      ville = $17, autre_ville = $18, email = $19
    WHERE id = $20 AND auto_ecole_id = $21
  `, [
    data.full_name, data.cin || null, data.phone || null, data.address || null,
    data.license_type, data.registration_date, data.status,
    data.training_start_date, data.training_duration_days || 30,
    data.offer_id || null, data.total_price || 0, data.interested_licenses || null,
    data.reminder_date || null, data.internal_notes || null,
    data.birth_place || null, data.birth_date || null,
    data.ville || null, data.autre_ville || null, data.email || null,
    id, autoEcoleId,
  ]);
}

async function updateStudentImage(id, autoEcoleId, field, imagePath) {
  const allowed = { profile_image: 'profile_image', cin_document: 'cin_document' };
  const col = allowed[field];
  if (!col) throw new Error('Invalid field');
  return execute(`UPDATE students SET ${col} = $1 WHERE id = $2 AND auto_ecole_id = $3`, [imagePath, id, autoEcoleId]);
}

async function deleteStudent(id, autoEcoleId) {
  return execute('DELETE FROM students WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function markLicenseObtained(id, autoEcoleId, licenseType, dateObtained) {
  return execute(`
    UPDATE students SET
      license_obtained = true, license_obtained_type = $1, license_obtained_date = $2,
      status = 'Permis obtenu'
    WHERE id = $3 AND auto_ecole_id = $4
  `, [licenseType, dateObtained, id, autoEcoleId]);
}

async function updateStudentFollowUp(id, autoEcoleId, data) {
  return execute(`
    UPDATE students SET
      interested_licenses = $1, reminder_date = $2, internal_notes = $3
    WHERE id = $4 AND auto_ecole_id = $5
  `, [data.interested_licenses, data.reminder_date, data.internal_notes, id, autoEcoleId]);
}

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

async function recordAttendanceIn(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const timeIn = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );
  if (existing) return { success: false, message: 'Déjà présent', attendance: existing };

  const row = await queryOne(
    "INSERT INTO attendance (auto_ecole_id, student_id, date, time_in, status) VALUES ($1, $2, $3, $4, 'Présent') RETURNING id",
    [autoEcoleId, studentId, today, timeIn]
  );
  const student = await queryOne('SELECT full_name FROM students WHERE id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);
  return { success: true, message: 'Entrée enregistrée', id: row.id, student_name: student?.full_name, time_in: timeIn };
}

async function recordAttendanceOut(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const timeOut = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );
  if (!existing) return { success: false, message: "Pas d'entrée enregistrée aujourd'hui" };

  await execute("UPDATE attendance SET time_out = $1, status = 'Sorti' WHERE id = $2", [timeOut, existing.id]);
  const student = await queryOne('SELECT full_name FROM students WHERE id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);
  return { success: true, message: 'Sortie enregistrée', student_name: student?.full_name, time_out: timeOut };
}

async function getAttendanceByStudent(studentId, autoEcoleId) {
  return query(
    'SELECT * FROM attendance WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY date DESC, time_in DESC',
    [studentId, autoEcoleId]
  );
}

async function getTodayAttendance(autoEcoleId) {
  return query(`
    SELECT a.*, s.full_name, s.qr_code FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.date = $1 AND a.auto_ecole_id = $2
    ORDER BY a.time_in DESC
  `, [new Date().toISOString().split('T')[0], autoEcoleId]);
}

async function cleanupDuplicateAttendance(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await execute(`
    DELETE FROM attendance
    WHERE id IN (
      SELECT a1.id FROM attendance a1
      INNER JOIN attendance a2 ON a1.student_id = a2.student_id AND a1.date = a2.date AND a2.auto_ecole_id = $2
      WHERE a1.id > a2.id AND a1.date = $1 AND a1.auto_ecole_id = $2
    )
  `, [today, autoEcoleId]);
  return { deleted: result.rowCount || 0 };
}

async function getStudentAttendanceStatus(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const row = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );
  return row ? 'present' : 'absent';
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

async function createPayment(autoEcoleId, data) {
  const row = await queryOne(
    'INSERT INTO payments (auto_ecole_id, student_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [autoEcoleId, data.student_id, data.amount, data.payment_method || 'Cash', data.payment_date, data.notes || null]
  );
  return { id: row.id };
}

async function getPaymentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM payments WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY payment_date DESC', [studentId, autoEcoleId]);
}

async function getAllPayments(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const limitClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT p.*, s.full_name, s.cin FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.auto_ecole_id = $1
    ORDER BY p.payment_date DESC
    ${limitClause}
  `, [autoEcoleId]);
}

async function deletePayment(id, autoEcoleId) {
  return execute('DELETE FROM payments WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ─── PAYMENT SCHEDULES ───────────────────────────────────────────────────────

async function createPaymentSchedule(autoEcoleId, studentId, schedules) {
  await execute('DELETE FROM payment_schedules WHERE student_id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);
  for (let i = 0; i < schedules.length; i++) {
    await execute(
      'INSERT INTO payment_schedules (auto_ecole_id, student_id, installment_number, amount, due_date) VALUES ($1, $2, $3, $4, $5)',
      [autoEcoleId, studentId, i + 1, schedules[i].amount, schedules[i].due_date]
    );
  }
  return { success: true };
}

async function getPaymentSchedulesByStudent(studentId, autoEcoleId) {
  return query(`
    SELECT ps.*, p.payment_date as actual_payment_date FROM payment_schedules ps
    LEFT JOIN payments p ON ps.payment_id = p.id
    WHERE ps.student_id = $1 AND ps.auto_ecole_id = $2
    ORDER BY ps.installment_number
  `, [studentId, autoEcoleId]);
}

async function markScheduleAsPaid(scheduleId, paymentId, autoEcoleId) {
  return execute(
    'UPDATE payment_schedules SET paid = true, paid_date = $1, payment_id = $2 WHERE id = $3 AND auto_ecole_id = $4',
    [new Date().toISOString().split('T')[0], paymentId, scheduleId, autoEcoleId]
  );
}

async function getOverduePayments(autoEcoleId) {
  return query(`
    SELECT ps.*, s.full_name, s.phone, s.total_price FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id
    WHERE ps.paid = false AND ps.due_date < $1 AND ps.auto_ecole_id = $2
    ORDER BY ps.due_date
  `, [new Date().toISOString().split('T')[0], autoEcoleId]);
}

async function getUpcomingPayments(autoEcoleId, days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setDate(future.getDate() + days);
  return query(`
    SELECT ps.*, s.full_name, s.phone FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id
    WHERE ps.paid = false AND ps.due_date >= $1 AND ps.due_date <= $2 AND ps.auto_ecole_id = $3
    ORDER BY ps.due_date
  `, [today, future.toISOString().split('T')[0], autoEcoleId]);
}

// ─── STAGES ──────────────────────────────────────────────────────────────────

async function createStage(autoEcoleId, data) {
  const row = await queryOne(`
    INSERT INTO stages (auto_ecole_id, student_id, type, title, scheduled_date, scheduled_time, duration_minutes, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
  `, [
    autoEcoleId, data.student_id, data.type, data.title,
    data.scheduled_date, data.scheduled_time || null,
    data.duration_minutes || 60, data.status || 'Planifié', data.notes || null,
  ]);
  return { id: row.id };
}

async function updateStage(id, autoEcoleId, data) {
  return execute(`
    UPDATE stages SET type = $1, title = $2, scheduled_date = $3, scheduled_time = $4,
    duration_minutes = $5, status = $6, result = $7, notes = $8
    WHERE id = $9 AND auto_ecole_id = $10
  `, [
    data.type, data.title, data.scheduled_date, data.scheduled_time || null,
    data.duration_minutes || 60, data.status, data.result || null, data.notes || null,
    id, autoEcoleId,
  ]);
}

async function deleteStage(id, autoEcoleId) {
  return execute('DELETE FROM stages WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getStagesByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM stages WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY scheduled_date DESC', [studentId, autoEcoleId]);
}

async function getAllStages(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const limitClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id
    WHERE st.auto_ecole_id = $1
    ORDER BY st.scheduled_date DESC
    ${limitClause}
  `, [autoEcoleId]);
}

async function getUpcomingStages(autoEcoleId, days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setDate(future.getDate() + days);
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id
    WHERE st.status = 'Planifié' AND st.scheduled_date >= $1 AND st.scheduled_date <= $2 AND st.auto_ecole_id = $3
    ORDER BY st.scheduled_date
  `, [today, future.toISOString().split('T')[0], autoEcoleId]);
}

async function getTodayStages(autoEcoleId) {
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id
    WHERE st.scheduled_date = $1 AND st.auto_ecole_id = $2
    ORDER BY st.scheduled_time
  `, [new Date().toISOString().split('T')[0], autoEcoleId]);
}

async function getSessionTimeStats(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const buildQ = (cond) => `
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count,
      COALESCE(SUM(CASE WHEN type = 'Séance' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as seance_minutes,
      COALESCE(SUM(CASE WHEN type = 'Examen' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as examen_minutes,
      COALESCE(SUM(CASE WHEN type = 'Code' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as code_minutes
    FROM stages WHERE status != 'Annulé' AND auto_ecole_id = $1 AND ${cond}
  `;
  return {
    day: await queryOne(buildQ('scheduled_date = $2'), [autoEcoleId, today]),
    week: await queryOne(buildQ('scheduled_date >= $2'), [autoEcoleId, weekStartStr]),
    month: await queryOne(buildQ('scheduled_date >= $2'), [autoEcoleId, monthStart]),
  };
}

async function getStudentSessionTimeStats(studentId, autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const buildQ = (cond) => `
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count
    FROM stages WHERE status != 'Annulé' AND student_id = $1 AND auto_ecole_id = $2 AND ${cond}
  `;
  return {
    day: await queryOne(buildQ('scheduled_date = $3'), [studentId, autoEcoleId, today]),
    week: await queryOne(buildQ('scheduled_date >= $3'), [studentId, autoEcoleId, weekStartStr]),
    month: await queryOne(buildQ('scheduled_date >= $3'), [studentId, autoEcoleId, monthStart]),
    total: await queryOne(`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
        COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
        COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count
      FROM stages WHERE status != 'Annulé' AND student_id = $1 AND auto_ecole_id = $2
    `, [studentId, autoEcoleId]),
  };
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

async function getAllAlerts(autoEcoleId) {
  const alerts = [];

  const overdue = await getOverduePayments(autoEcoleId);
  overdue.forEach((p) => {
    alerts.push({
      type: 'payment_overdue', severity: 'danger',
      title: 'Paiement en retard',
      message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`,
      date: p.due_date, student_id: p.student_id, related_id: p.id,
    });
  });

  const upcoming = await getUpcomingPayments(autoEcoleId, 7);
  upcoming.forEach((p) => {
    alerts.push({
      type: 'payment_upcoming', severity: 'warning',
      title: 'Paiement à venir',
      message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`,
      date: p.due_date, student_id: p.student_id, related_id: p.id,
    });
  });

  const endingSoon = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation' AND auto_ecole_id = $1
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) <= (CURRENT_DATE + INTERVAL '7 days')
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) >= CURRENT_DATE
  `, [autoEcoleId]);
  endingSoon.forEach((s) => {
    const end = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({
      type: 'training_ending', severity: 'info',
      title: 'Formation se termine bientôt',
      message: `${s.full_name} - Fin prévue: ${end}`,
      date: end, student_id: s.id,
    });
  });

  const expired = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation' AND auto_ecole_id = $1
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) < CURRENT_DATE
  `, [autoEcoleId]);
  expired.forEach((s) => {
    const end = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({
      type: 'training_expired', severity: 'danger',
      title: 'Formation expirée',
      message: `${s.full_name} - Formation terminée depuis ${end}`,
      date: end, student_id: s.id,
    });
  });

  const upcomingStages = await getUpcomingStages(autoEcoleId, 7);
  upcomingStages.forEach((s) => {
    const isExam = s.type === 'Examen';
    alerts.push({
      type: isExam ? 'exam_upcoming' : 'session_upcoming',
      severity: isExam ? 'warning' : 'info',
      title: isExam ? 'Examen à venir' : 'Séance planifiée',
      message: `${s.full_name} - ${s.title} ${s.scheduled_time ? 'à ' + s.scheduled_time : ''}`,
      date: s.scheduled_date, student_id: s.student_id, related_id: s.id,
    });
  });

  const todayStages = await getTodayStages(autoEcoleId);
  todayStages.forEach((s) => {
    if (!alerts.find((a) => a.related_id === s.id && a.type.includes('upcoming'))) {
      alerts.push({
        type: 'stage_today', severity: 'success',
        title: "Aujourd'hui",
        message: `${s.full_name} - ${s.title} ${s.scheduled_time ? 'à ' + s.scheduled_time : ''}`,
        date: s.scheduled_date, student_id: s.student_id, related_id: s.id,
      });
    }
  });

  const reminders = await query(`
    SELECT * FROM students WHERE reminder_date IS NOT NULL AND auto_ecole_id = $1
    AND reminder_date >= CURRENT_DATE AND reminder_date <= (CURRENT_DATE + INTERVAL '7 days')
    ORDER BY reminder_date
  `, [autoEcoleId]);
  reminders.forEach((s) => {
    const d = s.reminder_date instanceof Date ? s.reminder_date.toISOString().split('T')[0] : s.reminder_date;
    alerts.push({
      type: 'reminder', severity: 'info', title: 'Rappel',
      message: `${s.full_name}${s.interested_licenses ? ' - Intéressé par: ' + s.interested_licenses : ''}`,
      date: d, student_id: s.id,
    });
  });

  const order = { danger: 0, warning: 1, info: 2, success: 3 };
  return alerts.sort((a, b) => {
    const da = typeof a.date === 'string' ? a.date : a.date instanceof Date ? a.date.toISOString().split('T')[0] : '';
    const db = typeof b.date === 'string' ? b.date : b.date instanceof Date ? b.date.toISOString().split('T')[0] : '';
    return da === db ? order[a.severity] - order[b.severity] : da.localeCompare(db);
  });
}

async function getAlertsCounts(autoEcoleId) {
  const alerts = await getAllAlerts(autoEcoleId);
  return {
    total: alerts.length,
    danger: alerts.filter((a) => a.severity === 'danger').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };
}

// ─── INVOICES ────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(autoEcoleId) {
  const year = new Date().getFullYear();
  const last = await queryOne(
    'SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 AND auto_ecole_id = $2 ORDER BY id DESC LIMIT 1',
    [`FAC-${year}-%`, autoEcoleId]
  );
  const num = last ? parseInt(last.invoice_number.split('-')[2]) + 1 : 1;
  return `FAC-${year}-${String(num).padStart(4, '0')}`;
}

async function createInvoice(autoEcoleId, data) {
  const invoiceNumber = await generateInvoiceNumber(autoEcoleId);
  const row = await queryOne(`
    INSERT INTO invoices (auto_ecole_id, invoice_number, student_id, payment_id, amount, issue_date, due_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
  `, [
    autoEcoleId, invoiceNumber, data.student_id, data.payment_id || null,
    data.amount, data.issue_date || new Date().toISOString().split('T')[0],
    data.due_date || null, data.status || 'Émise', data.notes || null,
  ]);
  return { id: row.id, invoice_number: invoiceNumber };
}

async function getInvoiceById(id, autoEcoleId) {
  return queryOne(`
    SELECT i.*, s.full_name, s.cin, s.phone, s.address, s.license_type, p.payment_method, p.payment_date
    FROM invoices i
    JOIN students s ON i.student_id = s.id
    LEFT JOIN payments p ON i.payment_id = p.id
    WHERE i.id = $1 AND i.auto_ecole_id = $2
  `, [id, autoEcoleId]);
}

async function getInvoicesByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM invoices WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY issue_date DESC', [studentId, autoEcoleId]);
}

async function getAllInvoices(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const limitClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT i.*, s.full_name, s.cin, p.payment_method
    FROM invoices i
    JOIN students s ON i.student_id = s.id
    LEFT JOIN payments p ON i.payment_id = p.id
    WHERE i.auto_ecole_id = $1
    ORDER BY i.issue_date DESC
    ${limitClause}
  `, [autoEcoleId]);
}

async function updateInvoiceStatus(id, autoEcoleId, status) {
  return execute('UPDATE invoices SET status = $1 WHERE id = $2 AND auto_ecole_id = $3', [status, id, autoEcoleId]);
}

async function deleteInvoice(id, autoEcoleId) {
  return execute('DELETE FROM invoices WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

async function createDocument(autoEcoleId, data) {
  const row = await queryOne(
    'INSERT INTO documents (auto_ecole_id, student_id, type, name, file_path, file_type, file_size, description, file_content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
    [autoEcoleId, data.student_id, data.type, data.name, data.file_path, data.file_type || null, data.file_size || null, data.description || null, data.file_content || null]
  );
  return { id: row.id };
}

async function getDocumentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM documents WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY created_at DESC', [studentId, autoEcoleId]);
}

async function getDocumentById(id, autoEcoleId) {
  return queryOne('SELECT * FROM documents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getDocumentByPath(filePath, autoEcoleId) {
  if (autoEcoleId) {
    return queryOne('SELECT * FROM documents WHERE file_path = $1 AND auto_ecole_id = $2', [filePath, autoEcoleId]);
  }
  return queryOne('SELECT * FROM documents WHERE file_path = $1', [filePath]);
}

async function deleteDocument(id, autoEcoleId) {
  return execute('DELETE FROM documents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function deleteDocumentsByStudent(studentId, autoEcoleId) {
  return execute('DELETE FROM documents WHERE student_id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);
}

async function getAllDocuments(autoEcoleId) {
  return query('SELECT d.*, s.full_name FROM documents d JOIN students s ON d.student_id = s.id WHERE d.auto_ecole_id = $1 ORDER BY d.created_at DESC', [autoEcoleId]);
}

// ─── OFFERS ──────────────────────────────────────────────────────────────────

async function getAllOffers(autoEcoleId) {
  return query('SELECT * FROM offers WHERE active = true AND auto_ecole_id = $1 ORDER BY name', [autoEcoleId]);
}

async function createOffer(autoEcoleId, data) {
  const row = await queryOne(
    'INSERT INTO offers (auto_ecole_id, name, license_type, price, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [autoEcoleId, data.name, data.license_type, data.price, data.description || null]
  );
  return { id: row.id };
}

async function updateOffer(id, autoEcoleId, data) {
  return execute(
    'UPDATE offers SET name = $1, license_type = $2, price = $3, description = $4 WHERE id = $5 AND auto_ecole_id = $6',
    [data.name, data.license_type, data.price, data.description || null, id, autoEcoleId]
  );
}

async function deleteOffer(id, autoEcoleId) {
  return execute('UPDATE offers SET active = false WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

async function getSettings(autoEcoleId) {
  return queryOne('SELECT * FROM settings WHERE auto_ecole_id = $1', [autoEcoleId]);
}

async function updateSettings(autoEcoleId, data) {
  return execute(`
    UPDATE settings SET school_name = $1, address = $2, phone = $3, email = $4,
    default_training_days = $5, license_number = $6, tax_register = $7, commercial_register = $8,
    city = $9, web_reference = $10, fax = $11, logo = $12,
    gsm = $13, tp = $14, cnss = $15, ice = $16, capital = $17
    WHERE auto_ecole_id = $18
  `, [
    data.school_name, data.address || null, data.phone || null, data.email || null,
    data.default_training_days || 30, data.license_number || null, data.tax_register || null,
    data.commercial_register || null, data.city || null, data.web_reference || null,
    data.fax || null, data.logo || null, data.gsm || null, data.tp || null,
    data.cnss || null, data.ice || null, data.capital || null, autoEcoleId,
  ]);
}

async function createSettingsForAutoEcole(autoEcoleId, data = {}) {
  return execute(`
    INSERT INTO settings (auto_ecole_id, school_name, address, phone, gsm, email, fax, city,
      tax_register, commercial_register, tp, cnss, ice, capital, web_reference, logo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (auto_ecole_id) DO UPDATE SET
      school_name = EXCLUDED.school_name,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      gsm = EXCLUDED.gsm,
      email = EXCLUDED.email,
      fax = EXCLUDED.fax,
      city = EXCLUDED.city,
      tax_register = EXCLUDED.tax_register,
      commercial_register = EXCLUDED.commercial_register,
      tp = EXCLUDED.tp,
      cnss = EXCLUDED.cnss,
      ice = EXCLUDED.ice,
      capital = EXCLUDED.capital,
      web_reference = EXCLUDED.web_reference,
      logo = EXCLUDED.logo
  `, [
    autoEcoleId, data.school_name || 'Auto-École', data.address || null,
    data.phone || null, data.gsm || null, data.email || null, data.fax || null,
    data.city || null, data.tax_register || null, data.commercial_register || null,
    data.tp || null, data.cnss || null, data.ice || null, data.capital || null,
    data.web_reference || null, data.logo || null,
  ]);
}

// ─── INCIDENTS ───────────────────────────────────────────────────────────────

async function createIncident(autoEcoleId, data) {
  const row = await queryOne(
    "INSERT INTO incidents (auto_ecole_id, student_id, type, severity, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [autoEcoleId, data.student_id, data.type, data.severity || 'Avertissement', data.description, data.date]
  );
  return { id: row.id };
}

async function getIncidentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM incidents WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY date DESC', [studentId, autoEcoleId]);
}

async function getAllIncidents(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const limitClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id WHERE i.auto_ecole_id = $1 ORDER BY i.date DESC ${limitClause}`, [autoEcoleId]);
}

async function getUnresolvedIncidents(autoEcoleId) {
  return query('SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id WHERE i.resolved = false AND i.auto_ecole_id = $1 ORDER BY i.date DESC', [autoEcoleId]);
}

async function resolveIncident(id, autoEcoleId, notes) {
  return execute(
    'UPDATE incidents SET resolved = true, resolved_date = $1, resolved_notes = $2 WHERE id = $3 AND auto_ecole_id = $4',
    [new Date().toISOString().split('T')[0], notes || null, id, autoEcoleId]
  );
}

async function deleteIncident(id, autoEcoleId) {
  return execute('DELETE FROM incidents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getStudentIncidentsCount(studentId, autoEcoleId) {
  return queryOne(`
    SELECT COUNT(*) as total,
    SUM(CASE WHEN resolved = false THEN 1 ELSE 0 END) as unresolved,
    SUM(CASE WHEN severity = 'Grave' THEN 1 ELSE 0 END) as serious
    FROM incidents WHERE student_id = $1 AND auto_ecole_id = $2
  `, [studentId, autoEcoleId]);
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function getDashboardStats(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [
    totalRow, activeRow, licensesRow, attendanceRow,
    revenueRow, monthlyRow, pendingRow,
    reminders, recentStudents, recentPayments,
    totalExpensesRow, monthlyExpensesRow,
  ] = await Promise.all([
    queryOne('SELECT COUNT(*) as count FROM students WHERE auto_ecole_id = $1', [autoEcoleId]),
    queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'En formation' AND auto_ecole_id = $1", [autoEcoleId]),
    queryOne('SELECT COUNT(*) as count FROM students WHERE license_obtained = true AND auto_ecole_id = $1', [autoEcoleId]),
    queryOne('SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND auto_ecole_id = $2', [today, autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE auto_ecole_id = $1', [autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= $1 AND auto_ecole_id = $2', [monthStart, autoEcoleId]),
    queryOne('SELECT COUNT(*) as count FROM students s WHERE s.auto_ecole_id = $1 AND s.total_price > (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id)', [autoEcoleId]),
    query('SELECT * FROM students WHERE reminder_date IS NOT NULL AND reminder_date >= CURRENT_DATE AND auto_ecole_id = $1 ORDER BY reminder_date LIMIT 5', [autoEcoleId]),
    query('SELECT * FROM students WHERE auto_ecole_id = $1 ORDER BY created_at DESC LIMIT 5', [autoEcoleId]),
    query('SELECT p.*, s.full_name FROM payments p JOIN students s ON p.student_id = s.id WHERE p.auto_ecole_id = $1 ORDER BY p.created_at DESC LIMIT 5', [autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE tenant_id = $1', [autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= $1 AND tenant_id = $2', [monthStart, autoEcoleId]),
  ]);

  const [alertsCounts, todayStages] = await Promise.all([
    getAlertsCounts(autoEcoleId),
    getTodayStages(autoEcoleId),
  ]);

  const totalRevenue = parseFloat(revenueRow.total);
  const totalExpenses = parseFloat(totalExpensesRow.total);

  return {
    totalStudents: parseInt(totalRow.count),
    activeStudents: parseInt(activeRow.count),
    licensesObtained: parseInt(licensesRow.count),
    todayAttendance: parseInt(attendanceRow.count),
    totalRevenue,
    monthlyRevenue: parseFloat(monthlyRow.total),
    totalExpenses,
    monthlyExpenses: parseFloat(monthlyExpensesRow.total),
    profit: totalRevenue - totalExpenses,
    pendingPayments: parseInt(pendingRow.count),
    upcomingReminders: reminders,
    recentStudents,
    recentPayments,
    alertsCounts,
    todayStages,
  };
}

async function getSuperAdminDashboardStats() {
  const total = (await queryOne('SELECT COUNT(*) as count FROM auto_ecoles')).count;
  const active = (await queryOne('SELECT COUNT(*) as count FROM auto_ecoles WHERE active = true')).count;
  const students = (await queryOne('SELECT COUNT(*) as count FROM students')).count;
  const revenue = (await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments')).total;
  const autoEcoles = await query(`
    SELECT ae.*,
      (SELECT COUNT(*) FROM students WHERE auto_ecole_id = ae.id) as student_count,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE auto_ecole_id = ae.id) as revenue,
      (SELECT username FROM admins WHERE auto_ecole_id = ae.id LIMIT 1) as admin_username
    FROM auto_ecoles ae ORDER BY ae.created_at DESC
  `);
  return {
    totalAutoEcoles: parseInt(total),
    activeAutoEcoles: parseInt(active),
    totalStudents: parseInt(students),
    totalRevenue: parseFloat(revenue),
    autoEcoles: autoEcoles.map((ae) => ({ ...ae, student_count: parseInt(ae.student_count), revenue: parseFloat(ae.revenue) })),
  };
}

process.on('beforeExit', async () => {
  if (pool) { await pool.end(); pool = null; }
});

async function getAllExpenses(tenantId) {
  return query('SELECT * FROM expenses WHERE tenant_id = $1 ORDER BY date DESC', [tenantId]);
}

async function createExpense(tenantId, data) {
  const { category, subcategory, amount, date, notes } = data;
  return queryOne(
    'INSERT INTO expenses (tenant_id, category, subcategory, amount, date, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [tenantId, category, subcategory, amount, date || new Date(), notes]
  );
}

async function deleteExpense(tenantId, id) {
  return query('DELETE FROM expenses WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

async function getExpenseStats(tenantId) {
  const byCategory = await query(`
    SELECT category, SUM(amount) as total 
    FROM expenses 
    WHERE tenant_id = $1 
    GROUP BY category
  `, [tenantId]);

  const monthly = await query(`
    SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as total 
    FROM expenses 
    WHERE tenant_id = $1 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 12
  `, [tenantId]);

  const total = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE tenant_id = $1', [tenantId]);

  return {
    byCategory,
    monthly,
    total: parseFloat(total.total)
  };
}

module.exports = {
  getDb, initDb, query, withTransaction,
  getAdminByUsername,
  getAllAutoEcoles, getAutoEcoleById, getAutoEcoleBySlug, createAutoEcole, updateAutoEcole, deleteAutoEcole,
  getAdminsByAutoEcole, createTenantAdmin, updateTenantAdminPassword, deleteTenantAdmin,
  createSettingsForAutoEcole, getSuperAdminDashboardStats,
  getAllStudents, getStudentById, createStudent, updateStudent, updateStudentImage, deleteStudent,
  markLicenseObtained, updateStudentFollowUp,
  recordAttendanceIn, recordAttendanceOut, getAttendanceByStudent, getTodayAttendance,
  cleanupDuplicateAttendance, getStudentAttendanceStatus,
  createPayment, getPaymentsByStudent, getAllPayments, deletePayment,
  createPaymentSchedule, getPaymentSchedulesByStudent, markScheduleAsPaid,
  getOverduePayments, getUpcomingPayments,
  createStage, updateStage, deleteStage, getStagesByStudent, getAllStages,
  getUpcomingStages, getTodayStages, getSessionTimeStats, getStudentSessionTimeStats,
  getAllAlerts, getAlertsCounts,
  generateInvoiceNumber, createInvoice, getInvoiceById, getInvoicesByStudent, getAllInvoices,
  updateInvoiceStatus, deleteInvoice,
  createDocument, getDocumentsByStudent, getDocumentById, getDocumentByPath, deleteDocument, deleteDocumentsByStudent, getAllDocuments,
  getAllOffers, createOffer, updateOffer, deleteOffer,
  getDashboardStats, getSettings, updateSettings,
  createIncident, getIncidentsByStudent, getAllIncidents, getUnresolvedIncidents,
  resolveIncident, deleteIncident, getStudentIncidentsCount,
  getAllExpenses, createExpense, deleteExpense, getExpenseStats,
};
