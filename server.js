const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных
initDatabase();

// API маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/practices', require('./routes/practices'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/characteristics', require('./routes/characteristics'));
app.use('/api/reports', require('./routes/reports'));

// SPA — все остальные маршруты отдают index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`\n🎓 PractDay AI запущен на http://localhost:${PORT}`);
  console.log(`📋 API доступен на http://localhost:${PORT}/api`);
  console.log(`\n👤 Администратор: admin@practday.kz / admin123\n`);
});
