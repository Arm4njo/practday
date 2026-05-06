const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { analyzeSingleReview, analyzeMultipleReviews } = require('../ai/nlp');

// POST /api/reviews — партнёр оставляет отзыв
router.post('/', authenticateToken, requireRole('partner'), async (req, res) => {
  try {
    const { student_id, practice_id, review_text } = req.body;
    if (!student_id || !practice_id || !review_text) {
      return res.status(400).json({ error: 'Заполните все поля: студент, практика, текст отзыва' });
    }

    // Анализ тональности через Gemini
    const resultAI = await analyzeSingleReview(review_text);
    const sentiment_score = resultAI.score;
    const sentiment_label = resultAI.label;
    const aspects = resultAI.aspects || [];

    const result = db.prepare(`
      INSERT INTO reviews (student_id, practice_id, partner_user_id, review_text, sentiment_score, sentiment_label, key_aspects, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(student_id, practice_id, req.user.id, review_text, sentiment_score, sentiment_label, JSON.stringify(aspects));

    // Уведомление студенту
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
      .run(student_id, 'review', 'Новый отзыв', 'Вы получили новый отзыв от социального партнёра');

    // Уведомление админу
    const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)')
        .run(admin.id, 'review', 'Новый отзыв', `Партнёр оставил отзыв о студенте`);
    }

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Отзыв сохранён и проанализирован', review, sentiment, aspects });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// GET /api/reviews — отзывы
router.get('/', authenticateToken, (req, res) => {
  const { student_id, practice_id } = req.query;
  let query = `
    SELECT r.*, u.full_name as student_name, p.title as practice_title, pu.full_name as partner_name
    FROM reviews r
    JOIN users u ON r.student_id = u.id
    JOIN practices p ON r.practice_id = p.id
    JOIN users pu ON r.partner_user_id = pu.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'student') {
    query += ' AND r.student_id = ?';
    params.push(req.user.id);
  } else if (student_id) {
    query += ' AND r.student_id = ?';
    params.push(student_id);
  }
  if (practice_id) { query += ' AND r.practice_id = ?'; params.push(practice_id); }

  query += ' ORDER BY r.created_at DESC';
  const reviews = db.prepare(query).all(...params);
  res.json({ reviews });
});

// GET /api/reviews/analysis/:student_id/:practice_id — сводный анализ отзывов
router.get('/analysis/:student_id/:practice_id', authenticateToken, async (req, res) => {
  const reviews = db.prepare('SELECT * FROM reviews WHERE student_id = ? AND practice_id = ?').all(req.params.student_id, req.params.practice_id);
  const analysis = await analyzeMultipleReviews(reviews);
  res.json({ analysis });
});

module.exports = router;
