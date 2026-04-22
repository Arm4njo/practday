// pages/users.js — User management (admin)
Router.register('/users', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_users');
  const content = document.getElementById('contentArea');

  if (Auth.getRole() !== 'admin') {
    content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Доступ запрещён</h3></div>';
    return;
  }

  try {
    const data = await API.get('/auth/users');
    content.innerHTML = `
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fas fa-search"></i>
          <input type="text" class="form-input" id="userSearch" placeholder="${I18N.t('search')}" oninput="UsersPage.filter()">
        </div>
        <select class="form-select" id="userRoleFilter" onchange="UsersPage.filter()">
          <option value="">${I18N.t('role')} — ${I18N.t('all')}</option>
          <option value="admin">${I18N.t('role_admin')}</option>
          <option value="student">${I18N.t('role_student')}</option>
          <option value="partner">${I18N.t('role_partner')}</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="UsersPage.showImportForm()"><i class="fas fa-file-import"></i> Импорт студентов</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table id="usersTable">
            <thead><tr><th>ФИО</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Группа</th><th>Организация</th><th>Дата регистрации</th></tr></thead>
            <tbody>
              ${data.users.map(u => {
                const roleLabels = { admin: I18N.t('role_admin'), student: I18N.t('role_student'), partner: I18N.t('role_partner'), guest: I18N.t('role_guest') };
                return `
                  <tr data-name="${u.full_name.toLowerCase()}" data-email="${u.email.toLowerCase()}" data-role="${u.role}">
                    <td><strong>${u.full_name}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.phone || '—'}</td>
                    <td><span class="status status-${u.role === 'admin' ? 'approved' : u.role === 'student' ? 'submitted' : 'confirmed'}">${roleLabels[u.role]}</span></td>
                    <td>${u.group_name || '—'}</td>
                    <td>${u.organization || '—'}</td>
                    <td style="font-size:0.82rem;">${u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const UsersPage = {
  filter() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const role = document.getElementById('userRoleFilter').value;
    document.querySelectorAll('#usersTable tbody tr').forEach(row => {
      const matchSearch = !search || row.dataset.name.includes(search) || row.dataset.email.includes(search);
      const matchRole = !role || row.dataset.role === role;
      row.style.display = matchSearch && matchRole ? '' : 'none';
    });
  },

  showImportForm() {
    App.showModal(`
      <h3 style="margin-bottom:16px;"><i class="fas fa-file-import" style="color:var(--primary)"></i> Импорт студентов</h3>
      <p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.88rem;">
        Вставьте данные студентов в формате JSON. Каждый студент должен содержать поля: full_name, email, phone (опционально), group_name, specialty.
      </p>
      <div class="form-group">
        <textarea class="form-textarea" id="importData" style="min-height:200px;font-family:monospace;font-size:0.85rem;" placeholder='[
  {"full_name": "Иванов Иван Иванович", "email": "ivanov@mail.kz", "group_name": "ИС-21-1", "specialty": "Информационные системы"},
  {"full_name": "Петрова Анна Сергеевна", "email": "petrova@mail.kz", "group_name": "ИС-21-1", "specialty": "Информационные системы"}
]'></textarea>
      </div>
      <button class="btn btn-primary" onclick="UsersPage.doImport()"><i class="fas fa-upload"></i> Импортировать</button>
    `);
  },

  async doImport() {
    try {
      const raw = document.getElementById('importData').value;
      const students = JSON.parse(raw);
      const result = await API.post('/auth/import-students', { students });
      App.closeModal();
      App.showToast(result.message, 'success');
      Router.navigate('/users');
    } catch(err) {
      App.showToast('Ошибка: ' + err.message, 'error');
    }
  }
};
