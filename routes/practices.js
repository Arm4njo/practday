const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

// GET /api/practices — список практик с фильтрами
router.get('/', optionalAuth, (req, res) => {
  const { city, discipline, format, status, partner_id, search } = req.query;
  let query = `
    SELECT p.*, pr.name as partner_name, pr.address as partner_address, pr.city as partner_city,
    (SELECT COUNT(*) FROM practice_applications WHERE practice_id = p.id AND status = 'approved') as current_students
    FROM practices p
    LEFT JOIN partners pr ON p.partner_id = pr.id
    WHERE 1=1
  `;
  const params = [];

  if (city) { query += ' AND (p.city LIKE ? OR pr.city LIKE ?)'; params.push(`%${city}%`, `%${city}%`); }
  if (discipline) { query += ' AND p.discipline LIKE ?'; params.push(`%${discipline}%`); }
  if (format) { query += ' AND p.format = ?'; params.push(format); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (partner_id) { query += ' AND p.partner_id = ?'; params.push(partner_id); }
  if (search) { query += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY p.created_at DESC';
  const practices = db.prepare(query).all(...params);
  res.json({ practices });
});

// GET /api/practices/:id
router.get('/:id', optionalAuth, (req, res) => {
  const practice = db.prepare(`
    SELECT p.*, pr.name as partner_name, pr.address as partner_address, pr.city as partner_city,
    pr.contact_person, pr.contact_email, pr.latitude, pr.longitude, pr.radius
    FROM practices p
    LEFT JOIN partners pr ON p.partner_id = pr.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!practice) return res.status(404).json({ error: 'Практика не найдена' });
  res.json({ practice });
});

// POST /api/practices — создание практики (admin)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { title, partner_id, discipline, format, city, start_date, end_date, max_students, description, requirements } = req.body;
    if (!title || !discipline || !format) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const result = db.prepare(`
      INSERT INTO practices (title, partner_id, discipline, format, city, start_date, end_date, max_students, description, requirements, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, partner_id || null, discipline, format, city || null, start_date || null, end_date || null, max_students || 10, description || null, requirements || null, req.user.id);

    const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Практика создана', practice });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// PUT /api/practices/:id (admin)
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const { title, discipline, format, city, start_date, end_date, max_students, description, requirements, status } = req.body;
  db.prepare(`
    UPDATE practices SET title=COALESCE(?,title), discipline=COALESCE(?,discipline), format=COALESCE(?,format),
    city=COALESCE(?,city), start_date=COALESCE(?,start_date), end_date=COALESCE(?,end_date),
    max_students=COALESCE(?,max_students), description=COALESCE(?,description), requirements=COALESCE(?,requirements),
    status=COALESCE(?,status) WHERE id=?
  `).run(title, discipline, format, city, start_date, end_date, max_students, description, requirements, status, req.params.id);
  const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(req.params.id);
  res.json({ message: 'Практика обновлена', practice });
});

// POST /api/practices/:id/apply — заявка студента
router.post('/:id/apply', authenticateToken, requireRole('student'), (req, res) => {
  const practiceId = req.params.id;
  const existing = db.prepare('SELECT id FROM practice_applications WHERE student_id = ? AND practice_id = ?').get(req.user.id, practiceId);
  if (existing) return res.status(400).json({ error: 'Вы уже подали заявку на эту практику' });

  const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(practiceId);
  if (!practice) return res.status(404).json({ error: 'Практика не найдена' });

  db.prepare('INSERT INTO practice_applications (student_id, practice_id) VALUES (?, ?)').run(req.user.id, practiceId);

  // Уведомление администратору
  const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
  const studentName = db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.user.id);
  for (const admin of admins) {
    db.prepare('INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)')
      .run(admin.id, 'application', 'Новая заявка на практику', `${studentName.full_name} подал(а) заявку на практику "${practice.title}"`, `/practices/${practiceId}`);
  }

  res.status(201).json({ message: 'Заявка подана' });
});

// GET /api/practices/applications/my — заявки текущего студента
router.get('/applications/my', authenticateToken, requireRole('student'), (req, res) => {
  const apps = db.prepare(`
    SELECT pa.*, p.title, p.discipline, p.format, p.start_date, p.end_date,
    pr.name as partner_name
    FROM practice_applications pa
    JOIN practices p ON pa.practice_id = p.id
    LEFT JOIN partners pr ON p.partner_id = pr.id
    WHERE pa.student_id = ?
    ORDER BY pa.applied_at DESC
  `).all(req.user.id);
  res.json({ applications: apps });
});

// GET /api/practices/applications/all — все заявки (admin)
router.get('/applications/all', authenticateToken, requireRole('admin'), (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT pa.*, p.title as practice_title, p.discipline, u.full_name as student_name, u.group_name,
    pr.name as partner_name
    FROM practice_applications pa
    JOIN practices p ON pa.practice_id = p.id
    JOIN users u ON pa.student_id = u.id
    LEFT JOIN partners pr ON p.partner_id = pr.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND pa.status = ?'; params.push(status); }
  query += ' ORDER BY pa.applied_at DESC';

  const apps = db.prepare(query).all(...params);
  res.json({ applications: apps });
});

// PUT /api/practices/applications/:id/decide (admin)
router.put('/applications/:id/decide', authenticateToken, requireRole('admin'), (req, res) => {
  const { status, curator_id, partner_user_id } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Статус должен быть approved или rejected' });
  }

  db.prepare(`
    UPDATE practice_applications SET status=?, curator_id=?, partner_user_id=?, decided_at=datetime('now'), decided_by=?
    WHERE id=?
  `).run(status, curator_id || null, partner_user_id || null, req.user.id, req.params.id);

  // Уведомление студенту
  const app = db.prepare('SELECT student_id, practice_id FROM practice_applications WHERE id = ?').get(req.params.id);
  if (app) {
    const practice = db.prepare('SELECT title FROM practices WHERE id = ?').get(app.practice_id);
    const msg = status === 'approved' ? `Ваша заявка на практику "${practice.title}" одобрена` : `Ваша заявка на практику "${practice.title}" отклонена`;
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
      .run(app.student_id, 'application_decision', 'Решение по заявке', msg);
  }

  res.json({ message: 'Решение принято' });
});

// --- Партнёры ---

// GET /api/practices/partners/list
router.get('/partners/list', optionalAuth, (req, res) => {
  const { city, search } = req.query;
  let query = 'SELECT * FROM partners WHERE is_active = 1';
  const params = [];
  if (city) { query += ' AND city LIKE ?'; params.push(`%${city}%`); }
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY name';
  const partners = db.prepare(query).all(...params);
  res.json({ partners });
});

// POST /api/practices/partners (admin)
router.post('/partners', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, address, city, contact_person, contact_email, contact_phone, description, latitude, longitude, radius } = req.body;
  if (!name) return res.status(400).json({ error: 'Введите название организации' });

  const result = db.prepare(`
    INSERT INTO partners (name, address, city, contact_person, contact_email, contact_phone, description, latitude, longitude, radius, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, address, city, contact_person, contact_email, contact_phone, description, latitude || null, longitude || null, radius || 300, req.user.id);

  const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Партнёр добавлен', partner });
});

module.exports = router;
