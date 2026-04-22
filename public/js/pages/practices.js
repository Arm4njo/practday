// pages/practices.js — Practice catalog & management
Router.register('/practices', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('practice_catalog');
  const role = Auth.getRole();

  try {
    const data = await API.get('/practices');
    const partners = await API.get('/practices/partners/list');
    const content = document.getElementById('contentArea');

    content.innerHTML = `
      <div class="filter-bar">
        <div class="search-input-wrap">
          <i class="fas fa-search"></i>
          <input type="text" class="form-input" id="practiceSearch" placeholder="${I18N.t('search')}" oninput="PracticesPage.filter()">
        </div>
        <select class="form-select" id="practiceCity" onchange="PracticesPage.filter()">
          <option value="">${I18N.t('city')} — ${I18N.t('all')}</option>
          ${[...new Set(data.practices.map(p => p.city || p.partner_city).filter(Boolean))].map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select class="form-select" id="practiceDiscipline" onchange="PracticesPage.filter()">
          <option value="">${I18N.t('discipline')} — ${I18N.t('all')}</option>
          ${[...new Set(data.practices.map(p => p.discipline).filter(Boolean))].map(d => `<option value="${d}">${d}</option>`).join('')}
        </select>
        <select class="form-select" id="practiceFormat" onchange="PracticesPage.filter()">
          <option value="">${I18N.t('format')} — ${I18N.t('all')}</option>
          <option value="onsite">${I18N.t('format_onsite')}</option>
          <option value="remote">${I18N.t('format_remote')}</option>
          <option value="hybrid">${I18N.t('format_hybrid')}</option>
        </select>
        ${role === 'admin' ? `
          <button class="btn btn-primary btn-sm" onclick="PracticesPage.showCreateForm()"><i class="fas fa-plus"></i> ${I18N.t('add_practice')}</button>
          <button class="btn btn-secondary btn-sm" onclick="PracticesPage.showAddPartner()"><i class="fas fa-building"></i> ${I18N.t('add_partner')}</button>
        ` : ''}
      </div>

      <div class="practice-grid" id="practiceGrid">
        ${data.practices.map(p => PracticesPage.renderCard(p)).join('')}
        ${data.practices.length === 0 ? '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-briefcase"></i><h3>Нет доступных практик</h3></div>' : ''}
      </div>

      ${role === 'admin' ? `
        <div class="card" style="margin-top:24px;">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-inbox"></i> Заявки студентов</h3>
          </div>
          <div id="applicationsTable">Загрузка...</div>
        </div>
      ` : ''}
    `;

    PracticesPage.allPractices = data.practices;
    if (role === 'admin') PracticesPage.loadApplications();
  } catch(err) {
    document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation"></i><h3>Ошибка загрузки</h3><p>${err.message}</p></div>`;
  }
});

const PracticesPage = {
  allPractices: [],

  renderCard(p) {
    const formatLabel = { onsite: I18N.t('format_onsite'), remote: I18N.t('format_remote'), hybrid: I18N.t('format_hybrid') };
    return `
      <div class="practice-card" data-city="${p.city || p.partner_city || ''}" data-discipline="${p.discipline}" data-format="${p.format}" data-title="${p.title}" data-desc="${p.description || ''}">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div class="practice-card-title">${p.title}</div>
          <span class="status status-${p.status}">${p.status === 'active' ? 'Активна' : p.status}</span>
        </div>
        <div class="practice-card-org"><i class="fas fa-building"></i> ${p.partner_name || 'Не указано'}</div>
        <div class="practice-card-meta">
          <span class="practice-tag"><i class="fas fa-book"></i> ${p.discipline}</span>
          <span class="practice-tag"><i class="fas fa-map-marker-alt"></i> ${p.city || p.partner_city || '—'}</span>
          <span class="practice-tag"><i class="fas fa-laptop"></i> ${formatLabel[p.format] || p.format}</span>
          ${p.start_date ? `<span class="practice-tag"><i class="fas fa-calendar"></i> ${p.start_date}</span>` : ''}
          <span class="practice-tag"><i class="fas fa-users"></i> ${p.current_students || 0}/${p.max_students}</span>
        </div>
        ${p.description ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">${p.description}</p>` : ''}
        <div class="btn-group">
          ${Auth.getRole() === 'student' ? `<button class="btn btn-primary btn-sm" onclick="PracticesPage.apply(${p.id})"><i class="fas fa-paper-plane"></i> ${I18N.t('apply')}</button>` : ''}
          ${Auth.getRole() === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="PracticesPage.editPractice(${p.id})"><i class="fas fa-edit"></i> ${I18N.t('edit')}</button>` : ''}
        </div>
      </div>
    `;
  },

  filter() {
    const search = document.getElementById('practiceSearch').value.toLowerCase();
    const city = document.getElementById('practiceCity').value;
    const discipline = document.getElementById('practiceDiscipline').value;
    const format = document.getElementById('practiceFormat').value;

    document.querySelectorAll('.practice-card').forEach(card => {
      const matchSearch = !search || card.dataset.title.toLowerCase().includes(search) || card.dataset.desc.toLowerCase().includes(search);
      const matchCity = !city || card.dataset.city === city;
      const matchDiscipline = !discipline || card.dataset.discipline === discipline;
      const matchFormat = !format || card.dataset.format === format;
      card.style.display = matchSearch && matchCity && matchDiscipline && matchFormat ? '' : 'none';
    });
  },

  async apply(practiceId) {
    try {
      await API.post(`/practices/${practiceId}/apply`);
      App.showToast('Заявка подана успешно!', 'success');
      Router.navigate('/practices');
    } catch(err) {
      App.showToast(err.message, 'error');
    }
  },

  showCreateForm() {
    App.showModal(`
      <h3 style="margin-bottom:20px;"><i class="fas fa-plus" style="color:var(--primary);"></i> Создать практику</h3>
      <div class="form-group"><label class="form-label">Название *</label><input class="form-input" id="newPractTitle" placeholder="Производственная практика по программированию"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Дисциплина *</label><input class="form-input" id="newPractDiscipline" placeholder="Программирование"></div>
        <div class="form-group"><label class="form-label">Формат *</label>
          <select class="form-select" id="newPractFormat"><option value="onsite">Очно</option><option value="remote">Заочно</option><option value="hybrid">Гибрид</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Город</label><input class="form-input" id="newPractCity" placeholder="Павлодар"></div>
        <div class="form-group"><label class="form-label">Макс. студентов</label><input type="number" class="form-input" id="newPractMax" value="10"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Дата начала</label><input type="date" class="form-input" id="newPractStart"></div>
        <div class="form-group"><label class="form-label">Дата окончания</label><input type="date" class="form-input" id="newPractEnd"></div>
      </div>
      <div class="form-group"><label class="form-label">Партнёр</label>
        <select class="form-select" id="newPractPartner"><option value="">Не выбран</option></select>
      </div>
      <div class="form-group"><label class="form-label">Описание</label><textarea class="form-textarea" id="newPractDesc" placeholder="Описание практики..."></textarea></div>
      <button class="btn btn-primary" onclick="PracticesPage.createPractice()"><i class="fas fa-save"></i> Создать</button>
    `);

    // Load partners into select
    API.get('/practices/partners/list').then(data => {
      const sel = document.getElementById('newPractPartner');
      data.partners.forEach(p => {
        sel.innerHTML += `<option value="${p.id}">${p.name} (${p.city})</option>`;
      });
    });
  },

  async createPractice() {
    try {
      await API.post('/practices', {
        title: document.getElementById('newPractTitle').value,
        discipline: document.getElementById('newPractDiscipline').value,
        format: document.getElementById('newPractFormat').value,
        city: document.getElementById('newPractCity').value,
        max_students: parseInt(document.getElementById('newPractMax').value) || 10,
        start_date: document.getElementById('newPractStart').value || null,
        end_date: document.getElementById('newPractEnd').value || null,
        partner_id: document.getElementById('newPractPartner').value || null,
        description: document.getElementById('newPractDesc').value,
      });
      App.closeModal();
      App.showToast('Практика создана!', 'success');
      Router.navigate('/practices');
    } catch(err) {
      App.showToast(err.message, 'error');
    }
  },

  showAddPartner() {
    App.showModal(`
      <h3 style="margin-bottom:20px;"><i class="fas fa-building" style="color:var(--primary);"></i> Добавить партнёра</h3>
      <div class="form-group"><label class="form-label">Название организации *</label><input class="form-input" id="newPartName"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Город</label><input class="form-input" id="newPartCity" value="Павлодар"></div>
        <div class="form-group"><label class="form-label">Адрес</label><input class="form-input" id="newPartAddress"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Контактное лицо</label><input class="form-input" id="newPartContact"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="newPartEmail"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Телефон</label><input class="form-input" id="newPartPhone"></div>
        <div class="form-group"><label class="form-label">Радиус геозоны (м)</label><input type="number" class="form-input" id="newPartRadius" value="300"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Широта (lat)</label><input type="number" step="any" class="form-input" id="newPartLat"></div>
        <div class="form-group"><label class="form-label">Долгота (lng)</label><input type="number" step="any" class="form-input" id="newPartLng"></div>
      </div>
      <div class="form-group"><label class="form-label">Описание</label><textarea class="form-textarea" id="newPartDesc"></textarea></div>
      <button class="btn btn-primary" onclick="PracticesPage.createPartner()"><i class="fas fa-save"></i> Добавить</button>
    `);
  },

  async createPartner() {
    try {
      await API.post('/practices/partners', {
        name: document.getElementById('newPartName').value,
        city: document.getElementById('newPartCity').value,
        address: document.getElementById('newPartAddress').value,
        contact_person: document.getElementById('newPartContact').value,
        contact_email: document.getElementById('newPartEmail').value,
        contact_phone: document.getElementById('newPartPhone').value,
        latitude: parseFloat(document.getElementById('newPartLat').value) || null,
        longitude: parseFloat(document.getElementById('newPartLng').value) || null,
        radius: parseInt(document.getElementById('newPartRadius').value) || 300,
        description: document.getElementById('newPartDesc').value,
      });
      App.closeModal();
      App.showToast('Партнёр добавлен!', 'success');
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async loadApplications() {
    try {
      const data = await API.get('/practices/applications/all');
      const el = document.getElementById('applicationsTable');
      if (!el) return;

      if (data.applications.length === 0) {
        el.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Нет заявок</p>';
        return;
      }

      el.innerHTML = `
        <div class="table-container"><table>
          <thead><tr><th>Студент</th><th>Группа</th><th>Практика</th><th>Партнёр</th><th>Статус</th><th>Действия</th></tr></thead>
          <tbody>
            ${data.applications.map(a => `
              <tr>
                <td><strong>${a.student_name}</strong></td>
                <td>${a.group_name || '—'}</td>
                <td>${a.practice_title}</td>
                <td>${a.partner_name || '—'}</td>
                <td><span class="status status-${a.status}">${I18N.t('status_' + a.status)}</span></td>
                <td>
                  ${a.status === 'pending' ? `
                    <div class="btn-group">
                      <button class="btn btn-sm btn-success" onclick="PracticesPage.decide(${a.id},'approved')"><i class="fas fa-check"></i></button>
                      <button class="btn btn-sm btn-danger" onclick="PracticesPage.decide(${a.id},'rejected')"><i class="fas fa-times"></i></button>
                    </div>
                  ` : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `;
    } catch(err) { console.error(err); }
  },

  async decide(appId, status) {
    try {
      await API.put(`/practices/applications/${appId}/decide`, { status });
      App.showToast(status === 'approved' ? 'Заявка одобрена' : 'Заявка отклонена', 'success');
      this.loadApplications();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  editPractice(id) {
    App.showToast('Редактирование практики #' + id, 'info');
  }
};
