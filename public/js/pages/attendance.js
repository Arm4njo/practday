// pages/attendance.js — Attendance tracking with geolocation
Router.register('/attendance', async (params) => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_attendance');
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');
  const practiceId = params.practice_id || new URLSearchParams(window.location.hash.split('?')[1]).get('practice_id');

  try {
    const query = practiceId ? `?practice_id=${practiceId}` : (role === 'student' ? '' : '');
    const data = await API.get('/attendance' + query);

    content.innerHTML = `
      ${role === 'student' && practiceId ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-map-marker-alt"></i> Отметить присутствие</h3>
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-success btn-lg" onclick="AttendancePage.checkIn(${practiceId})">
              <i class="fas fa-sign-in-alt"></i> ${I18N.t('check_in')}
            </button>
            <button class="btn btn-warning btn-lg" onclick="AttendancePage.checkOut(${practiceId})">
              <i class="fas fa-sign-out-alt"></i> ${I18N.t('check_out')}
            </button>
            <span id="geoStatus" style="font-size:0.85rem;color:var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Определение местоположения...</span>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-clipboard-list"></i> Журнал посещаемости</h3>
          <div class="btn-group">
            <button class="btn btn-sm btn-secondary" onclick="AttendancePage.exportReport()"><i class="fas fa-download"></i> Экспорт</button>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${role !== 'student' ? '<th>Студент</th>' : ''}
                <th>Практика</th><th>Тип</th><th>Режим</th><th>Геолокация</th><th>Подтверждение</th><th>Дата/Время</th>
                ${role === 'partner' ? '<th>Действия</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${data.attendance.map(a => `
                <tr>
                  ${role !== 'student' ? `<td><strong>${a.student_name}</strong></td>` : ''}
                  <td>${a.practice_title}</td>
                  <td>${a.check_type === 'checkin' ? '<span style="color:var(--success)"><i class="fas fa-arrow-right"></i> Вход</span>' : '<span style="color:var(--warning)"><i class="fas fa-arrow-left"></i> Выход</span>'}</td>
                  <td>${a.mode === 'onsite' ? 'Очно' : 'Заочно'}</td>
                  <td>${a.is_location_valid ? '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ✓</span>' : '<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> ✗</span>'}</td>
                  <td>${a.confirmed_by_partner ? '<span class="status status-approved">Подтверждено</span>' : '<span class="status status-pending">Ожидает</span>'}</td>
                  <td style="font-size:0.82rem;">${new Date(a.created_at).toLocaleString('ru-RU')}</td>
                  ${role === 'partner' ? `<td>${!a.confirmed_by_partner ? `<button class="btn btn-sm btn-success" onclick="AttendancePage.confirm(${a.id})"><i class="fas fa-check"></i></button>` : '—'}</td>` : ''}
                </tr>
              `).join('')}
              ${data.attendance.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:30px;">Нет записей</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Get geolocation
    if (role === 'student' && practiceId) AttendancePage.getLocation();
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const AttendancePage = {
  currentLat: null,
  currentLng: null,

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentLat = pos.coords.latitude;
          this.currentLng = pos.coords.longitude;
          const el = document.getElementById('geoStatus');
          if (el) el.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> Координаты: ${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)}`;
        },
        (err) => {
          const el = document.getElementById('geoStatus');
          if (el) el.innerHTML = `<i class="fas fa-exclamation-circle" style="color:var(--warning)"></i> Геолокация недоступна`;
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  },

  async checkIn(practiceId) {
    try {
      const data = await API.post('/attendance/checkin', {
        practice_id: practiceId,
        latitude: this.currentLat,
        longitude: this.currentLng,
        mode: this.currentLat ? 'onsite' : 'remote',
      });
      App.showToast(`Вход отмечен! ${data.is_location_valid ? '✓ Геолокация подтверждена' : '✗ Вне зоны практики'}`, data.is_location_valid ? 'success' : 'warning');
      Router.navigate('/attendance?practice_id=' + practiceId);
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async checkOut(practiceId) {
    try {
      await API.post('/attendance/checkout', {
        practice_id: practiceId,
        latitude: this.currentLat,
        longitude: this.currentLng,
      });
      App.showToast('Выход отмечен!', 'success');
      Router.navigate('/attendance?practice_id=' + practiceId);
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async confirm(id) {
    try {
      await API.put(`/attendance/${id}/confirm`);
      App.showToast('Присутствие подтверждено', 'success');
      Router.navigate('/attendance');
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  exportReport() {
    App.showToast('Формирование отчёта...', 'info');
  }
};
