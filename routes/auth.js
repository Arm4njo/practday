const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { generateToken, authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { full_name, email, phone, password, role, group_name, specialty, organization } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Заполните обязательные поля: ФИО, email, пароль, роль' });
    }

    if (!['student', 'partner', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const token = Math.random().toString(36).substring(2, 15);

    const result = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, group_name, specialty, organization, verification_token, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, email, phone || null, hash, role, group_name || null, specialty || null, organization || null, token, 1);

    const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const jwt = generateToken(user);

    res.status(201).json({ message: 'Регистрация успешна', user, token: jwt });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Вход успешен',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, language: user.language }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, full_name, email, phone, role, group_name, specialty, organization, language, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, phone, language } = req.body;
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), language = COALESCE(?, language), updated_at = datetime(\'now\') WHERE id = ?')
      .run(full_name || null, phone || null, language || null, req.user.id);
    const user = db.prepare('SELECT id, full_name, email, phone, role, language FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Профиль обновлён', user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const token = Math.random().toString(36).substring(2, 15);
  const expires = new Date(Date.now() + 3600000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  res.json({ message: 'Ссылка для восстановления пароля отправлена на email', reset_token: token });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime(\'now\')').get(token);
  if (!user) return res.status(400).json({ error: 'Недействительная или просроченная ссылка' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Пароль успешно изменён' });
});

// GET /api/auth/users (admin only)
router.get('/users', authenticateToken, requireRole('admin'), (req, res) => {
  const { role, search, group_name } = req.query;
  let query = 'SELECT id, full_name, email, phone, role, group_name, specialty, organization, is_verified, created_at FROM users WHERE 1=1';
  const params = [];

  if (role) { query += ' AND role = ?'; params.push(role); }
  if (search) { query += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (group_name) { query += ' AND group_name = ?'; params.push(group_name); }

  query += ' ORDER BY created_at DESC';
  const users = db.prepare(query).all(...params);
  res.json({ users });
});

// POST /api/auth/import-students (admin only — CSV import)
router.post('/import-students', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Предоставьте массив студентов' });
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users (full_name, email, phone, password_hash, role, group_name, specialty, is_verified)
      VALUES (?, ?, ?, ?, 'student', ?, ?, 1)
    `);

    let imported = 0;
    const defaultHash = bcrypt.hashSync('student123', 10);

    for (const s of students) {
      if (s.full_name && s.email) {
        const result = stmt.run(s.full_name, s.email, s.phone || null, defaultHash, s.group_name || null, s.specialty || null);
        if (result.changes > 0) imported++;
      }
    }

    res.json({ message: `Импортировано ${imported} студентов из ${students.length}`, imported });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка импорта: ' + err.message });
  }
});

module.exports = router;
