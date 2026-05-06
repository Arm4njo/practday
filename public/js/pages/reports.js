// pages/reports.js — Reports & Analytics (admin)
Router.register('/reports', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('reports_title');
  const content = document.getElementById('contentArea');

  try {
    const stats = await API.get('/reports/statistics');
    const s = stats.statistics;

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div><div class="stat-value">${s.total_students}</div><div class="stat-label">Студентов</div></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-handshake"></i></div><div><div class="stat-value">${s.total_partners}</div><div class="stat-label">Партнёров</div></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><i class="fas fa-briefcase"></i></div><div><div class="stat-value">${s.total_practices}</div><div class="stat-label">Практик</div></div></div>
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-check-double"></i></div><div><div class="stat-value">${s.approved_applications}</div><div class="stat-label">Одобрено заявок</div></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-book"></i></div><div><div class="stat-value">${s.total_diary_entries}</div><div class="stat-label">Записей в дневниках</div></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fas fa-star"></i></div><div><div class="stat-value">${s.total_reviews}</div><div class="stat-label">Отзывов</div></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-bar"></i> По группам</h3>
          </div>
          ${s.by_groups.length > 0 ? `
            <div class="table-container"><table>
              <thead><tr><th>Группа</th><th>Студенты</th><th>Одобрено</th><th>%</th></tr></thead>
              <tbody>
                ${s.by_groups.map(g => {
                  const pct = g.students > 0 ? Math.round((g.approved / g.students) * 100) : 0;
                  return `<tr>
                    <td><strong>${g.group_name || '—'}</strong></td>
                    <td>${g.students}</td>
                    <td>${g.approved}</td>
                    <td>
                      <div class="progress-bar" style="width:80px;display:inline-block;vertical-align:middle;">
                        <div class="progress-fill ${pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red'}" style="width:${pct}%"></div>
                      </div>
                      <span style="font-size:0.8rem;margin-left:6px;">${pct}%</span>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>
          ` : '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Нет данных</p>'}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-download"></i> Экспорт отчётов</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-secondary" onclick="ReportsPage.loadAttendanceReport()"><i class="fas fa-clipboard-check"></i> Отчёт по посещаемости</button>
            <button class="btn btn-secondary" onclick="ReportsPage.loadProgressReport()"><i class="fas fa-chart-line"></i> Отчёт по прогрессу</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;" id="reportDetailArea"></div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-chart-pie"></i><h3>Отчёты</h3><p>${err.message}</p></div>`;
  }
});

const ReportsPage = {
  async loadAttendanceReport() {
    try {
      const data = await API.get('/reports/attendance');
      const el = document.getElementById('reportDetailArea');
      el.innerHTML = `
        <div class="card-header"><h3 class="card-title"><i class="fas fa-clipboard-check"></i> Отчёт по посещаемости</h3></div>
        <div class="table-container"><table>
          <thead><tr><th>Студент</th><th>Группа</th><th>Практика</th><th>Дни</th><th>Подтверждено</th></tr></thead>
          <tbody>
            ${data.report.map(r => `
              <tr>
                <td><strong>${r.full_name}</strong></td>
                <td>${r.group_name || '—'}</td>
                <td>${r.practice_title}</td>
                <td>${r.present_days || 0}</td>
                <td>${r.confirmed_count || 0}</td>
              </tr>
            `).join('')}
            ${data.report.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">Нет данных</td></tr>' : ''}
          </tbody>
        </table></div>
        <div style="margin-top:16px;">
          <button class="btn btn-sm btn-info" onclick="ReportsPage.exportCSV('attendance')"><i class="fas fa-file-csv"></i> Экспорт в CSV (Excel)</button>
        </div>
      `;
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async loadProgressReport() {
    try {
      const data = await API.get('/reports/progress');
      const el = document.getElementById('reportDetailArea');
      el.innerHTML = `
        <div class="card-header"><h3 class="card-title"><i class="fas fa-chart-line"></i> Отчёт по прогрессу</h3></div>
        <div class="table-container"><table>
          <thead><tr><th>Студент</th><th>Группа</th><th>Практика</th><th>Записей</th><th>Часы</th><th>Утверждено</th><th>Отзывов</th><th>Характеристика</th></tr></thead>
          <tbody>
            ${data.report.map(r => `
              <tr>
                <td><strong>${r.full_name}</strong></td>
                <td>${r.group_name || '—'}</td>
                <td>${r.practice_title}</td>
                <td>${r.diary_entries_count}</td>
                <td>${r.total_hours}</td>
                <td>${r.approved_entries}</td>
                <td>${r.reviews_count}</td>
                <td>${r.characteristic_status ? `<span class="status status-${r.characteristic_status}">${r.characteristic_status}</span>` : '—'}</td>
              </tr>
            `).join('')}
            ${data.report.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary)">Нет данных</td></tr>' : ''}
          </tbody>
        </table></div>
        <div style="margin-top:16px;">
          <button class="btn btn-sm btn-info" onclick="ReportsPage.exportCSV('progress')"><i class="fas fa-file-csv"></i> Экспорт в CSV (Excel)</button>
        </div>
      `;
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  exportCSV(type) {
    const table = document.querySelector('#reportDetailArea table');
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) 
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv.push(row.join(';'));
    }

    const csvContent = "\uFEFF" + csv.join("\n"); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Отчет_${type}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast('Экспорт завершён', 'success');
  }
};
