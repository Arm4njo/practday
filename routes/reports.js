const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/reports/attendance — отчёт по посещаемости
router.get('/attendance', authenticateToken, requireRole('admin'), (req, res) => {
  const { practice_id, group_name, date_from, date_to } = req.query;

  let query = `
    SELECT u.id as student_id, u.full_name, u.group_name,
    p.title as practice_title, p.discipline,
    COUNT(DISTINCT CASE WHEN a.check_type = 'checkin' THEN date(a.created_at) END) as present_days,
    SUM(CASE WHEN a.confirmed_by_partner = 1 THEN 1 ELSE 0 END) as confirmed_count
    FROM practice_applications pa
    JOIN users u ON pa.student_id = u.id
    JOIN practices p ON pa.practice_id = p.id
    LEFT JOIN attendance a ON a.student_id = u.id AND a.practice_id = p.id
    WHERE pa.status = 'approved'
  `;
  const params = [];

  if (practice_id) { query += ' AND p.id = ?'; params.push(practice_id); }
  if (group_name) { query += ' AND u.group_name = ?'; params.push(group_name); }
  if (date_from) { query += ' AND date(a.created_at) >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND date(a.created_at) <= ?'; params.push(date_to); }

  query += ' GROUP BY u.id, p.id ORDER BY u.group_name, u.full_name';
  const report = db.prepare(query).all(...params);
  res.json({ report });
});

// GET /api/reports/progress — отчёт по прогрессу
router.get('/progress', authenticateToken, requireRole('admin'), (req, res) => {
  const { practice_id, group_name } = req.query;

  let query = `
    SELECT u.id as student_id, u.full_name, u.group_name,
    p.id as practice_id, p.title as practice_title, p.discipline, p.start_date, p.end_date,
    (SELECT COUNT(*) FROM diary_entries d WHERE d.student_id = u.id AND d.practice_id = p.id AND d.status != 'rejected') as diary_entries_count,
    (SELECT COALESCE(SUM(d.hours),0) FROM diary_entries d WHERE d.student_id = u.id AND d.practice_id = p.id AND d.status != 'rejected') as total_hours,
    (SELECT COUNT(*) FROM diary_entries d WHERE d.student_id = u.id AND d.practice_id = p.id AND d.status = 'admin_approved') as approved_entries,
    (SELECT COUNT(*) FROM reviews r WHERE r.student_id = u.id AND r.practice_id = p.id) as reviews_count,
    (SELECT c.status FROM characteristics c WHERE c.student_id = u.id AND c.practice_id = p.id LIMIT 1) as characteristic_status
    FROM practice_applications pa
    JOIN users u ON pa.student_id = u.id
    JOIN practices p ON pa.practice_id = p.id
    WHERE pa.status = 'approved'
  `;
  const params = [];
  if (practice_id) { query += ' AND p.id = ?'; params.push(practice_id); }
  if (group_name) { query += ' AND u.group_name = ?'; params.push(group_name); }

  query += ' ORDER BY u.group_name, u.full_name';
  const report = db.prepare(query).all(...params);
  res.json({ report });
});

// GET /api/reports/statistics — общая статистика
router.get('/statistics', authenticateToken, (req, res) => {
  if (req.user.role === 'admin') {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get();
    const totalPartners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'partner'").get();
    const totalPractices = db.prepare('SELECT COUNT(*) as count FROM practices').get();
    const activePractices = db.prepare("SELECT COUNT(*) as count FROM practices WHERE status = 'active'").get();
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM practice_applications').get();
    const approvedApps = db.prepare("SELECT COUNT(*) as count FROM practice_applications WHERE status = 'approved'").get();
    const totalDiaryEntries = db.prepare('SELECT COUNT(*) as count FROM diary_entries').get();
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    const totalCharacteristics = db.prepare('SELECT COUNT(*) as count FROM characteristics').get();

    // По группам
    const groupStats = db.prepare(`
      SELECT u.group_name, COUNT(DISTINCT u.id) as students,
      COUNT(DISTINCT pa.practice_id) as practices,
      (SELECT COUNT(*) FROM practice_applications pa2 JOIN users u2 ON pa2.student_id = u2.id WHERE u2.group_name = u.group_name AND pa2.status = 'approved') as approved
      FROM users u
      LEFT JOIN practice_applications pa ON pa.student_id = u.id
      WHERE u.role = 'student' AND u.group_name IS NOT NULL
      GROUP BY u.group_name
    `).all();

    res.json({
      statistics: {
        total_students: totalStudents.count,
        total_partners: totalPartners.count,
        total_practices: totalPractices.count,
        active_practices: activePractices.count,
        total_applications: totalApplications.count,
        approved_applications: approvedApps.count,
        total_diary_entries: totalDiaryEntries.count,
        total_reviews: totalReviews.count,
        total_characteristics: totalCharacteristics.count,
        by_groups: groupStats,
      }
    });
  } else if (req.user.role === 'partner') {
    // Статистика для социального партнёра
    const assignedStudents = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as count 
      FROM practice_applications 
      WHERE partner_user_id = ? AND status = 'approved'
    `).get(req.user.id);

    const pendingDiary = db.prepare(`
      SELECT COUNT(*) as count 
      FROM diary_entries d
      JOIN practice_applications pa ON d.student_id = pa.student_id AND d.practice_id = pa.practice_id
      WHERE pa.partner_user_id = ? AND d.status = 'submitted'
    `).get(req.user.id);

    const pendingAttendance = db.prepare(`
      SELECT COUNT(*) as count 
      FROM attendance a
      JOIN practice_applications pa ON a.student_id = pa.student_id AND a.practice_id = pa.practice_id
      WHERE pa.partner_user_id = ? AND a.confirmed_by_partner = 0
    `).get(req.user.id);

    res.json({
      statistics: {
        assigned_students: assignedStudents.count,
        pending_diary: pendingDiary.count,
        pending_attendance: pendingAttendance.count
      }
    });
  } else {
    res.status(403).json({ error: 'Доступ запрещён' });
  }
});

// GET /api/reports/notifications — уведомления текущего пользователя
router.get('/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ notifications });
});

// PUT /api/reports/notifications/:id/read
router.put('/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Прочитано' });
});

// PUT /api/reports/notifications/read-all
router.put('/notifications/read-all', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Все уведомления прочитаны' });
});

// --- Чат/обратная связь ---

// POST /api/reports/messages
router.post('/messages', authenticateToken, (req, res) => {
  const { receiver_id, practice_id, message_text } = req.body;
  if (!message_text) return res.status(400).json({ error: 'Введите сообщение' });

  db.prepare('INSERT INTO messages (sender_id, receiver_id, practice_id, message_text) VALUES (?,?,?,?)')
    .run(req.user.id, receiver_id || null, practice_id || null, message_text);

  if (receiver_id) {
    db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?,?,?,?)')
      .run(receiver_id, 'message', 'Новое сообщение', `Сообщение от ${req.user.full_name}`);
  }

  res.status(201).json({ message: 'Сообщение отправлено' });
});

// GET /api/reports/messages
router.get('/messages', authenticateToken, (req, res) => {
  const { practice_id, other_user_id } = req.query;
  let query = `
    SELECT m.*, s.full_name as sender_name, r.full_name as receiver_name
    FROM messages m
    JOIN users s ON m.sender_id = s.id
    LEFT JOIN users r ON m.receiver_id = r.id
    WHERE (m.sender_id = ? OR m.receiver_id = ?)
  `;
  const params = [req.user.id, req.user.id];

  if (practice_id) { query += ' AND m.practice_id = ?'; params.push(practice_id); }
  if (other_user_id) { query += ' AND (m.sender_id = ? OR m.receiver_id = ?)'; params.push(other_user_id, other_user_id); }

  query += ' ORDER BY m.created_at DESC LIMIT 100';
  const messages = db.prepare(query).all(...params);
  res.json({ messages });
});

module.exports = router;
