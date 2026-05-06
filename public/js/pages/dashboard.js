// pages/dashboard.js — Dashboard
Router.register('/dashboard', async () => {
  App.restoreLayout();
  const role = Auth.getRole();
  document.getElementById('pageTitle').textContent = `${I18N.t('welcome')}, ${Auth.user.full_name}!`;

  if (role === 'admin') {
    await DashboardPage.renderAdmin();
  } else if (role === 'student') {
    await DashboardPage.renderStudent();
  } else if (role === 'partner') {
    await DashboardPage.renderPartner();
  }
});

const DashboardPage = {
  async renderAdmin() {
    try {
      const stats = await API.get('/reports/statistics');
      const s = stats.statistics;
      const content = document.getElementById('contentArea');

      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-users"></i></div>
            <div><div class="stat-value">${s.total_students}</div><div class="stat-label">${I18N.t('total_students')}</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-briefcase"></i></div>
            <div><div class="stat-value">${s.active_practices}</div><div class="stat-label">${I18N.t('active_practices')}</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><i class="fas fa-file-alt"></i></div>
            <div><div class="stat-value">${s.total_applications}</div><div class="stat-label">${I18N.t('applications')}</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-book"></i></div>
            <div><div class="stat-value">${s.total_diary_entries}</div><div class="stat-label">Записей в дневниках</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-comments"></i></div>
            <div><div class="stat-value">${s.total_reviews}</div><div class="stat-label">Отзывов партнёров</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-certificate"></i></div>
            <div><div class="stat-value">${s.total_characteristics}</div><div class="stat-label">Характеристик</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-chart-bar"></i> Статистика по группам</h3>
            </div>
            <div class="table-container">
              <table>
                <thead><tr><th>Группа</th><th>Студенты</th><th>Практик</th><th>Одобрено</th></tr></thead>
                <tbody>
                  ${s.by_groups.map(g => `
                    <tr>
                      <td><strong>${g.group_name || 'Без группы'}</strong></td>
                      <td>${g.students}</td>
                      <td>${g.practices}</td>
                      <td>${g.approved}</td>
                    </tr>
                  `).join('')}
                  ${s.by_groups.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">Нет данных</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-bolt"></i> Быстрые действия</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <button class="btn btn-primary" onclick="Router.navigate('/practices')"><i class="fas fa-plus"></i> Создать практику</button>
              <button class="btn btn-secondary" onclick="Router.navigate('/users')"><i class="fas fa-user-plus"></i> Управление пользователями</button>
              <button class="btn btn-secondary" onclick="Router.navigate('/reports')"><i class="fas fa-chart-pie"></i> Отчёты и аналитика</button>
              <button class="btn btn-secondary" onclick="Router.navigate('/characteristics')"><i class="fas fa-robot"></i> Генерация характеристик (ИИ)</button>
            </div>
          </div>
        </div>
      `;
    } catch(err) {
      document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><h3>Панель администратора</h3><p>Добавьте студентов и практики для начала работы</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate('/practices')"><i class="fas fa-plus"></i> Создать практику</button></div>`;
    }
  },

  async renderStudent() {
    const content = document.getElementById('contentArea');
    try {
      const apps = await API.get('/practices/applications/my');
      const notifs = await API.get('/reports/notifications');

      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-briefcase"></i></div>
            <div><div class="stat-value">${apps.applications.length}</div><div class="stat-label">Мои заявки</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
            <div><div class="stat-value">${apps.applications.filter(a => a.status === 'approved').length}</div><div class="stat-label">Одобренных</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><i class="fas fa-bell"></i></div>
            <div><div class="stat-value">${notifs.notifications.filter(n => !n.is_read).length}</div><div class="stat-label">Уведомлений</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-clipboard-list"></i> Мои практики</h3>
            <button class="btn btn-primary btn-sm" onclick="Router.navigate('/practices')"><i class="fas fa-search"></i> Найти практику</button>
          </div>
          ${apps.applications.length > 0 ? `
            <div class="table-container">
              <table>
                <thead><tr><th>Практика</th><th>Организация</th><th>Дисциплина</th><th>Формат</th><th>Статус</th><th>Действия</th></tr></thead>
                <tbody>
                  ${apps.applications.map(a => `
                    <tr>
                      <td><strong>${a.title}</strong></td>
                      <td>${a.partner_name || '—'}</td>
                      <td>${a.discipline}</td>
                      <td>${a.format === 'onsite' ? 'Очно' : a.format === 'remote' ? 'Заочно' : 'Гибрид'}</td>
                      <td><span class="status status-${a.status}">${I18N.t('status_' + a.status)}</span></td>
                      <td>
                        ${a.status === 'approved' ? `
                          <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="Router.navigate('/attendance?practice_id=${a.practice_id}')"><i class="fas fa-map-marker-alt"></i> Отметиться</button>
                            <button class="btn btn-sm btn-secondary" onclick="Router.navigate('/diary?practice_id=${a.practice_id}')"><i class="fas fa-book"></i> Дневник</button>
                          </div>
                        ` : '—'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><i class="fas fa-search"></i><h3>Нет заявок</h3><p>Выберите место практики из каталога</p></div>'}
        </div>
      `;
    } catch(err) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><h3>Панель студента</h3><p>Начните с выбора места практики</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="Router.navigate('/practices')"><i class="fas fa-search"></i> Каталог практик</button></div>`;
    }
  },

  async renderPartner() {
    const content = document.getElementById('contentArea');
    try {
      const stats = await API.get('/reports/statistics');
      const s = stats.statistics;

      content.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-user-graduate"></i></div>
            <div><div class="stat-value">${s.assigned_students}</div><div class="stat-label">Студенты на практике</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check"></i></div>
            <div><div class="stat-value">${s.pending_diary + s.pending_attendance}</div><div class="stat-label">Ожидает подтверждения</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><i class="fas fa-book"></i></div>
            <div><div class="stat-value">${s.pending_diary}</div><div class="stat-label">Дневники</div></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-bolt"></i> Быстрые действия</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
              <button class="btn btn-primary" onclick="Router.navigate('/diary')"><i class="fas fa-book"></i> Проверить дневники</button>
              <button class="btn btn-secondary" onclick="Router.navigate('/reviews')"><i class="fas fa-star"></i> Оставить отзыв</button>
              <button class="btn btn-secondary" onclick="Router.navigate('/attendance')"><i class="fas fa-clipboard-check"></i> Подтвердить посещаемость</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-info-circle"></i> Информация</h3>
            </div>
            <p style="margin-top:12px;color:var(--text-secondary);line-height:1.6;">Как социальный партнёр, вы можете подтверждать присутствие студентов, проверять записи в дневнике и оставлять отзывы для формирования характеристик.</p>
          </div>
        </div>
      `;
    } catch(err) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-briefcase"></i><h3>Панель партнёра</h3><p>Дождитесь назначения студентов на вашу практику</p></div>`;
    }
  }
};
