const { DatabaseSync: Database } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'practday.db');
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new Database(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Пользователи
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','student','partner','guest')),
      group_name TEXT,
      specialty TEXT,
      organization TEXT,
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expires TEXT,
      language TEXT DEFAULT 'ru',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Партнёры (предприятия)
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      contact_person TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      radius INTEGER DEFAULT 300,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Практики (места практики)
    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      partner_id INTEGER REFERENCES partners(id),
      discipline TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('onsite','remote','hybrid')),
      city TEXT,
      start_date TEXT,
      end_date TEXT,
      max_students INTEGER DEFAULT 10,
      description TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Заявки студентов на практику
    CREATE TABLE IF NOT EXISTS practice_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER NOT NULL REFERENCES practices(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      curator_id INTEGER REFERENCES users(id),
      partner_user_id INTEGER REFERENCES users(id),
      applied_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT,
      decided_by INTEGER REFERENCES users(id)
    );

    -- Учёт посещаемости
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER NOT NULL REFERENCES practices(id),
      check_type TEXT NOT NULL CHECK(check_type IN ('checkin','checkout')),
      mode TEXT NOT NULL CHECK(mode IN ('onsite','remote')),
      latitude REAL,
      longitude REAL,
      is_location_valid INTEGER DEFAULT 0,
      confirmed_by_partner INTEGER DEFAULT 0,
      partner_user_id INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Записи дневника практики
    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER NOT NULL REFERENCES practices(id),
      entry_date TEXT NOT NULL,
      work_description TEXT NOT NULL,
      skills TEXT,
      hours REAL DEFAULT 0,
      remarks TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','partner_confirmed','admin_approved','rejected')),
      confirmed_by_partner INTEGER REFERENCES users(id),
      confirmed_at TEXT,
      approved_by_admin INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- История изменений дневника
    CREATE TABLE IF NOT EXISTS diary_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diary_entry_id INTEGER NOT NULL REFERENCES diary_entries(id),
      changed_by INTEGER NOT NULL REFERENCES users(id),
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT DEFAULT (datetime('now'))
    );

    -- Шаблоны дневника по дисциплинам (РУП)
    CREATE TABLE IF NOT EXISTS diary_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discipline TEXT NOT NULL,
      template_name TEXT NOT NULL,
      fields TEXT NOT NULL,
      min_hours REAL DEFAULT 0,
      required_competencies TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Отзывы социальных партнёров
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER NOT NULL REFERENCES practices(id),
      partner_user_id INTEGER NOT NULL REFERENCES users(id),
      review_text TEXT NOT NULL,
      sentiment_score REAL,
      sentiment_label TEXT,
      key_aspects TEXT,
      analyzed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Характеристики студентов
    CREATE TABLE IF NOT EXISTS characteristics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER NOT NULL REFERENCES practices(id),
      template_name TEXT,
      generated_text TEXT,
      edited_text TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','generated','edited','approved')),
      generated_at TEXT,
      edited_by INTEGER REFERENCES users(id),
      edited_at TEXT,
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Шаблоны характеристик
    CREATE TABLE IF NOT EXISTS characteristic_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      template_text TEXT NOT NULL,
      fields TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Сообщения чата
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      practice_id INTEGER REFERENCES practices(id),
      message_text TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Уведомления
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Загруженные файлы (для заочных заданий)
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      practice_id INTEGER REFERENCES practices(id),
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Создание администратора по умолчанию
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Администратор Системы', 'admin@practday.kz', '+77001234567', hash, 'admin', 1);
    console.log('Создан администратор по умолчанию: admin@practday.kz / admin123');
  }

  console.log('База данных инициализирована.');
}

  console.log('База данных инициализирована.');
}

module.exports = { db, initDatabase };
