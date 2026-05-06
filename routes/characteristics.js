const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { analyzeMultipleReviews, generateCharacteristic } = require('../ai/nlp');

// POST /api/characteristics/generate — генерация характеристики ИИ
router.post('/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { student_id, practice_id, template_name } = req.body;
    if (!student_id || !practice_id) {
      return res.status(400).json({ error: 'Укажите студента и практику' });
    }

    // Собираем данные
    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(student_id);
    const practice = db.prepare(`
      SELECT p.*, pr.name as partner_name FROM practices p LEFT JOIN partners pr ON p.partner_id = pr.id WHERE p.id = ?
    `).get(practice_id);

    if (!student || !practice) return res.status(404).json({ error: 'Студент или практика не найдены' });

    // Данные посещаемости
    const checkins = db.prepare("SELECT COUNT(DISTINCT date(created_at)) as days FROM attendance WHERE student_id = ? AND practice_id = ? AND check_type = 'checkin'").get(student_id, practice_id);
    let totalDays = 30;
    if (practice.start_date && practice.end_date) {
      const sd = new Date(practice.start_date);
      const ed = new Date(practice.end_date);
      totalDays = Math.max(1, Math.ceil((ed - sd) / (1000 * 60 * 60 * 24)));
    }
    const attendanceData = {
      totalDays,
      presentDays: checkins.days,
      attendancePercent: Math.round((checkins.days / totalDays) * 100),
    };

    // Данные дневника
    const diaryEntries = db.prepare("SELECT * FROM diary_entries WHERE student_id = ? AND practice_id = ? AND status != 'rejected'").all(student_id, practice_id);
    const allSkills = [...new Set(diaryEntries.map(e => e.skills).filter(Boolean).join(',').split(',').map(s => s.trim()).filter(Boolean))];
    const totalHours = diaryEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const diaryData = { skills: allSkills, totalHours };

    // Анализ отзывов
    const reviews = db.prepare('SELECT * FROM reviews WHERE student_id = ? AND practice_id = ?').all(student_id, practice_id);
    const reviewsAnalysis = await analyzeMultipleReviews(reviews);

    // Генерация характеристики
    const text = await generateCharacteristic({
      studentName: student.full_name,
      organization: practice.partner_name,
      discipline: practice.discipline,
      startDate: practice.start_date,
      endDate: practice.end_date,
      attendanceData,
      diaryData,
      reviewsAnalysis,
    });

    // Сохраняем
    const existing = db.prepare('SELECT id FROM characteristics WHERE student_id = ? AND practice_id = ?').get(student_id, practice_id);
    if (existing) {
      db.prepare(`
        UPDATE characteristics SET template_name=?, generated_text=?, status='generated', generated_at=datetime('now') WHERE id=?
      `).run(template_name || 'Оценка профессиональных навыков', text, existing.id);
    } else {
      db.prepare(`
        INSERT INTO characteristics (student_id, practice_id, template_name, generated_text, status, generated_at)
        VALUES (?, ?, ?, ?, 'generated', datetime('now'))
      `).run(student_id, practice_id, template_name || 'Оценка профессиональных навыков', text);
    }

    // Уведомление студенту
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
      .run(student_id, 'characteristic', 'Характеристика сформирована', 'Ваша характеристика по практике сформирована');

    res.json({
      message: 'Характеристика сгенерирована',
      characteristic: text,
      reviewsAnalysis,
      attendanceData,
      diaryData,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// GET /api/characteristics
router.get('/', authenticateToken, (req, res) => {
  const { student_id, practice_id, status } = req.query;
  let query = `
    SELECT c.*, u.full_name as student_name, p.title as practice_title
    FROM characteristics c
    JOIN users u ON c.student_id = u.id
    JOIN practices p ON c.practice_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'student') {
    query += ' AND c.student_id = ?';
    params.push(req.user.id);
  } else if (student_id) {
    query += ' AND c.student_id = ?';
    params.push(student_id);
  }
  if (practice_id) { query += ' AND c.practice_id = ?'; params.push(practice_id); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }

  query += ' ORDER BY c.created_at DESC';
  const characteristics = db.prepare(query).all(...params);
  res.json({ characteristics });
});

// PUT /api/characteristics/:id/edit — редактирование (admin)
router.put('/:id/edit', authenticateToken, requireRole('admin'), (req, res) => {
  const { edited_text } = req.body;
  db.prepare("UPDATE characteristics SET edited_text=?, status='edited', edited_by=?, edited_at=datetime('now') WHERE id=?")
    .run(edited_text, req.user.id, req.params.id);
  res.json({ message: 'Характеристика отредактирована' });
});

// PUT /api/characteristics/:id/approve — утверждение (admin)
router.put('/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  db.prepare("UPDATE characteristics SET status='approved', approved_by=?, approved_at=datetime('now') WHERE id=?")
    .run(req.user.id, req.params.id);

  const char = db.prepare('SELECT student_id FROM characteristics WHERE id = ?').get(req.params.id);
  if (char) {
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
      .run(char.student_id, 'characteristic', 'Характеристика утверждена', 'Ваша характеристика утверждена администратором');
  }
  res.json({ message: 'Характеристика утверждена' });
});

// GET /api/characteristics/templates
router.get('/templates', authenticateToken, (req, res) => {
  const templates = db.prepare('SELECT * FROM characteristic_templates').all();
  res.json({ templates });
});

module.exports = router;
