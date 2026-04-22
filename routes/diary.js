const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/diary/templates — шаблоны дневника
router.get('/templates', authenticateToken, (req, res) => {
  const { discipline } = req.query;
  let query = 'SELECT * FROM diary_templates';
  const params = [];
  if (discipline) { query += ' WHERE discipline LIKE ?'; params.push(`%${discipline}%`); }
  const templates = db.prepare(query).all(...params);
  res.json({ templates });
});

// POST /api/diary — создание записи в дневнике
router.post('/', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { practice_id, entry_date, work_description, skills, hours, remarks } = req.body;
    if (!practice_id || !entry_date || !work_description) {
      return res.status(400).json({ error: 'Заполните обязательные поля: практика, дата, описание работ' });
    }

    const app = db.prepare("SELECT id FROM practice_applications WHERE student_id = ? AND practice_id = ? AND status = 'approved'").get(req.user.id, practice_id);
    if (!app) return res.status(403).json({ error: 'У вас нет одобренной заявки на эту практику' });

    const result = db.prepare(`
      INSERT INTO diary_entries (student_id, practice_id, entry_date, work_description, skills, hours, remarks, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')
    `).run(req.user.id, practice_id, entry_date, work_description, skills || null, hours || 0, remarks || null);

    const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Запись добавлена', entry });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// GET /api/diary — записи дневника
router.get('/', authenticateToken, (req, res) => {
  const { practice_id, student_id, status } = req.query;
  let query = `
    SELECT d.*, u.full_name as student_name, p.title as practice_title, p.discipline
    FROM diary_entries d
    JOIN users u ON d.student_id = u.id
    JOIN practices p ON d.practice_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'student') {
    query += ' AND d.student_id = ?';
    params.push(req.user.id);
  } else if (student_id) {
    query += ' AND d.student_id = ?';
    params.push(student_id);
  }

  if (practice_id) { query += ' AND d.practice_id = ?'; params.push(practice_id); }
  if (status) { query += ' AND d.status = ?'; params.push(status); }

  query += ' ORDER BY d.entry_date DESC';
  const entries = db.prepare(query).all(...params);
  res.json({ entries });
});

// PUT /api/diary/:id — обновление записи (студент)
router.put('/:id', authenticateToken, requireRole('student'), (req, res) => {
  const entry = db.prepare('SELECT * FROM diary_entries WHERE id = ? AND student_id = ?').get(req.params.id, req.user.id);
  if (!entry) return res.status(404).json({ error: 'Запись не найдена' });
  if (entry.status === 'admin_approved') return res.status(400).json({ error: 'Утверждённые записи нельзя редактировать' });

  const { work_description, skills, hours, remarks } = req.body;

  // Логирование изменений
  const logChange = db.prepare('INSERT INTO diary_history (diary_entry_id, changed_by, field_name, old_value, new_value) VALUES (?,?,?,?,?)');
  if (work_description && work_description !== entry.work_description) logChange.run(entry.id, req.user.id, 'work_description', entry.work_description, work_description);
  if (skills && skills !== entry.skills) logChange.run(entry.id, req.user.id, 'skills', entry.skills, skills);

  db.prepare(`
    UPDATE diary_entries SET work_description=COALESCE(?,work_description), skills=COALESCE(?,skills),
    hours=COALESCE(?,hours), remarks=COALESCE(?,remarks), status='submitted', updated_at=datetime('now') WHERE id=?
  `).run(work_description, skills, hours, remarks, req.params.id);

  res.json({ message: 'Запись обновлена' });
});

// PUT /api/diary/:id/confirm — подтверждение партнёром
router.put('/:id/confirm', authenticateToken, requireRole('partner'), (req, res) => {
  const { action, remarks } = req.body;
  if (!['confirm', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Действие должно быть confirm или reject' });
  }

  const newStatus = action === 'confirm' ? 'partner_confirmed' : 'rejected';
  db.prepare(`
    UPDATE diary_entries SET status=?, confirmed_by_partner=?, confirmed_at=datetime('now'), remarks=COALESCE(?,remarks), updated_at=datetime('now') WHERE id=?
  `).run(newStatus, req.user.id, remarks || null, req.params.id);

  // Уведомление студенту
  const entry = db.prepare('SELECT student_id, practice_id FROM diary_entries WHERE id = ?').get(req.params.id);
  if (entry) {
    const msg = action === 'confirm' ? 'Запись в дневнике подтверждена партнёром' : 'Запись в дневнике отклонена партнёром';
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(entry.student_id, 'diary', 'Дневник практики', msg);
  }

  res.json({ message: action === 'confirm' ? 'Запись подтверждена' : 'Запись отклонена' });
});

// PUT /api/diary/:id/approve — утверждение администратором
router.put('/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  const { action } = req.body;
  const newStatus = action === 'approve' ? 'admin_approved' : 'rejected';

  db.prepare(`
    UPDATE diary_entries SET status=?, approved_by_admin=?, approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?
  `).run(newStatus, req.user.id, req.params.id);

  const entry = db.prepare('SELECT student_id FROM diary_entries WHERE id = ?').get(req.params.id);
  if (entry) {
    const msg = action === 'approve' ? 'Запись в дневнике утверждена администратором' : 'Запись в дневнике отклонена администратором';
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(entry.student_id, 'diary', 'Дневник практики', msg);
  }

  res.json({ message: 'Решение принято' });
});

// GET /api/diary/:id/history — история изменений
router.get('/:id/history', authenticateToken, (req, res) => {
  const history = db.prepare(`
    SELECT dh.*, u.full_name as changed_by_name
    FROM diary_history dh
    JOIN users u ON dh.changed_by = u.id
    WHERE dh.diary_entry_id = ?
    ORDER BY dh.changed_at DESC
  `).all(req.params.id);
  res.json({ history });
});

// GET /api/diary/completeness/:practice_id — проверка полноты записей (соответствие РУП)
router.get('/completeness/:practice_id', authenticateToken, (req, res) => {
  const practiceId = req.params.practice_id;
  const studentId = req.user.role === 'student' ? req.user.id : req.query.student_id;

  const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(practiceId);
  if (!practice) return res.status(404).json({ error: 'Практика не найдена' });

  const template = db.prepare('SELECT * FROM diary_templates WHERE discipline = ?').get(practice.discipline);
  const entries = db.prepare("SELECT * FROM diary_entries WHERE student_id = ? AND practice_id = ? AND status != 'rejected'").all(studentId, practiceId);

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const allSkills = [...new Set(entries.map(e => e.skills).filter(Boolean).join(',').split(',').map(s => s.trim()).filter(Boolean))];

  let completeness = {
    total_entries: entries.length,
    total_hours: totalHours,
    required_hours: template ? template.min_hours : 0,
    hours_percent: template && template.min_hours > 0 ? Math.min(100, Math.round((totalHours / template.min_hours) * 100)) : 100,
    skills_covered: allSkills,
    required_competencies: template ? (template.required_competencies || '').split(',').map(s => s.trim()) : [],
    is_complete: false,
  };

  completeness.is_complete = completeness.hours_percent >= 100;

  res.json({ completeness });
});

module.exports = router;
