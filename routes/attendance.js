const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Формула Haversine для проверки расстояния
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Радиус Земли в метрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/attendance/checkin — отметка присутствия
router.post('/checkin', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { practice_id, latitude, longitude, mode, notes } = req.body;
    if (!practice_id) return res.status(400).json({ error: 'Укажите практику' });

    // Проверяем, одобрена ли заявка
    const app = db.prepare('SELECT id FROM practice_applications WHERE student_id = ? AND practice_id = ? AND status = ?').get(req.user.id, practice_id, 'approved');
    if (!app) return res.status(403).json({ error: 'У вас нет одобренной заявки на эту практику' });

    // Проверяем, не отмечен ли уже сегодня
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = db.prepare("SELECT id FROM attendance WHERE student_id = ? AND practice_id = ? AND check_type = 'checkin' AND date(created_at) = ?").get(req.user.id, practice_id, today);
    if (existingCheckin) return res.status(400).json({ error: 'Вы уже отметились сегодня' });

    let isLocationValid = 0;
    const attendMode = mode || 'onsite';

    // Проверка геолокации для очного формата
    if (attendMode === 'onsite' && latitude && longitude) {
      const practice = db.prepare(`
        SELECT p.*, pr.latitude as p_lat, pr.longitude as p_lng, pr.radius
        FROM practices p
        LEFT JOIN partners pr ON p.partner_id = pr.id
        WHERE p.id = ?
      `).get(practice_id);

      if (practice && practice.p_lat && practice.p_lng) {
        const distance = haversineDistance(latitude, longitude, practice.p_lat, practice.p_lng);
        const radius = practice.radius || 300;
        isLocationValid = distance <= radius ? 1 : 0;
      }
    } else if (attendMode === 'remote') {
      isLocationValid = 1;
    }

    db.prepare(`
      INSERT INTO attendance (student_id, practice_id, check_type, mode, latitude, longitude, is_location_valid, notes)
      VALUES (?, ?, 'checkin', ?, ?, ?, ?, ?)
    `).run(req.user.id, practice_id, attendMode, latitude || null, longitude || null, isLocationValid, notes || null);

    res.status(201).json({
      message: 'Вход отмечен',
      is_location_valid: isLocationValid,
      mode: attendMode,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// POST /api/attendance/checkout
router.post('/checkout', authenticateToken, requireRole('student'), (req, res) => {
  try {
    const { practice_id, latitude, longitude, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const checkin = db.prepare("SELECT * FROM attendance WHERE student_id = ? AND practice_id = ? AND check_type = 'checkin' AND date(created_at) = ?").get(req.user.id, practice_id, today);
    if (!checkin) return res.status(400).json({ error: 'Сначала отметьте вход' });

    const existingCheckout = db.prepare("SELECT id FROM attendance WHERE student_id = ? AND practice_id = ? AND check_type = 'checkout' AND date(created_at) = ?").get(req.user.id, practice_id, today);
    if (existingCheckout) return res.status(400).json({ error: 'Выход уже отмечен' });

    db.prepare(`
      INSERT INTO attendance (student_id, practice_id, check_type, mode, latitude, longitude, is_location_valid, notes)
      VALUES (?, ?, 'checkout', ?, ?, ?, ?, ?)
    `).run(req.user.id, practice_id, checkin.mode, latitude || null, longitude || null, checkin.is_location_valid, notes || null);

    res.json({ message: 'Выход отмечен' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка: ' + err.message });
  }
});

// PUT /api/attendance/:id/confirm — подтверждение партнёром
router.put('/:id/confirm', authenticateToken, requireRole('partner'), (req, res) => {
  db.prepare('UPDATE attendance SET confirmed_by_partner = 1, partner_user_id = ? WHERE id = ?').run(req.user.id, req.params.id);
  res.json({ message: 'Присутствие подтверждено' });
});

// GET /api/attendance — записи посещаемости
router.get('/', authenticateToken, (req, res) => {
  const { practice_id, student_id, date_from, date_to } = req.query;
  let query = `
    SELECT a.*, u.full_name as student_name, p.title as practice_title
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    JOIN practices p ON a.practice_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'student') {
    query += ' AND a.student_id = ?';
    params.push(req.user.id);
  } else if (student_id) {
    query += ' AND a.student_id = ?';
    params.push(student_id);
  }

  if (practice_id) { query += ' AND a.practice_id = ?'; params.push(practice_id); }
  if (date_from) { query += ' AND date(a.created_at) >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND date(a.created_at) <= ?'; params.push(date_to); }

  query += ' ORDER BY a.created_at DESC';
  const records = db.prepare(query).all(...params);
  res.json({ attendance: records });
});

// GET /api/attendance/summary — сводка по посещаемости
router.get('/summary', authenticateToken, (req, res) => {
  const { practice_id, student_id } = req.query;
  let whereStudent = req.user.role === 'student' ? req.user.id : student_id;

  if (!whereStudent || !practice_id) {
    return res.status(400).json({ error: 'Укажите student_id и practice_id' });
  }

  const practice = db.prepare('SELECT start_date, end_date FROM practices WHERE id = ?').get(practice_id);
  const checkins = db.prepare("SELECT COUNT(DISTINCT date(created_at)) as days FROM attendance WHERE student_id = ? AND practice_id = ? AND check_type = 'checkin'").get(whereStudent, practice_id);
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND practice_id = ?').get(whereStudent, practice_id);
  const confirmed = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND practice_id = ? AND confirmed_by_partner = 1').get(whereStudent, practice_id);

  let totalDays = 30;
  if (practice && practice.start_date && practice.end_date) {
    const start = new Date(practice.start_date);
    const end = new Date(practice.end_date);
    totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  res.json({
    summary: {
      present_days: checkins.days,
      total_days: totalDays,
      attendance_percent: Math.round((checkins.days / totalDays) * 100),
      total_records: totalRecords.count,
      confirmed_records: confirmed.count,
    }
  });
});

module.exports = router;
