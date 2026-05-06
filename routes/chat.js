// routes/chat.js
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/chat/messages — получение сообщений
router.get('/messages', authenticateToken, (req, res) => {
  const { partner_id, student_id, practice_id } = req.query;
  let query = `
    SELECT m.*, u.full_name as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Логика фильтрации сообщений (упрощенно)
  if (practice_id) { query += ' AND m.practice_id = ?'; params.push(practice_id); }
  
  query += ' ORDER BY m.created_at ASC';
  const messages = db.prepare(query).all(...params);
  res.json({ messages });
});

// POST /api/chat/messages — отправка сообщения
router.post('/messages', authenticateToken, (req, res) => {
  const { practice_id, message_text, receiver_id } = req.body;
  if (!message_text) return res.status(400).json({ error: 'Введите текст сообщения' });

  const result = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, practice_id, message_text)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, receiver_id || null, practice_id || null, message_text);

  const msg = db.prepare(`
    SELECT m.*, u.full_name as sender_name, u.role as sender_role
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: msg });
});

module.exports = router;
