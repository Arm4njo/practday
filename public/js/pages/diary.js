// pages/diary.js — Electronic practice diary
Router.register('/diary', async (params) => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('diary_title');
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');
  const practiceId = params.practice_id || new URLSearchParams(window.location.hash.split('?')[1]).get('practice_id');
  const studentId = params.student_id || new URLSearchParams(window.location.hash.split('?')[1]).get('student_id');

  try {
    let query = '';
    if (practiceId) query += (query ? '&' : '?') + `practice_id=${practiceId}`;
    if (studentId) query += (query ? '&' : '?') + `student_id=${studentId}`;
    
    const data = await API.get('/diary' + query);

    let completenessHTML = '';
    if (practiceId && role === 'student') {
      try {
        const comp = await API.get(`/diary/completeness/${practiceId}`);
        const c = comp.completeness;
        const progressColor = c.hours_percent >= 100 ? 'green' : c.hours_percent >= 50 ? 'yellow' : 'red';
        completenessHTML = `
          <div class="card" style="margin-bottom:20px;">
            <div class="card-header"><h3 class="card-title"><i class="fas fa-tasks"></i> ${I18N.t('completeness')} (соответствие РУП)</h3></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
              <div>
                <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px;">Записей</div>
                <div style="font-size:1.4rem;font-weight:700;">${c.total_entries}</div>
              </div>
              <div>
                <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px;">Часы: ${c.total_hours} / ${c.required_hours}</div>
                <div class="progress-bar"><div class="progress-fill ${progressColor}" style="width:${c.hours_percent}%"></div></div>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">${c.hours_percent}%</div>
              </div>
              <div>
                <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px;">Навыки</div>
                <div class="diary-skills">${c.skills_covered.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
              </div>
            </div>
          </div>
        `;
      } catch(e) {}
    }

    content.innerHTML = `
      ${completenessHTML}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-book"></i> Записи дневника</h3>
          <div class="btn-group">
            <button class="btn btn-sm btn-info" onclick="DiaryPage.exportPDF()"><i class="fas fa-file-pdf"></i> Экспорт PDF с ЭЦП</button>
            ${role === 'student' ? `<button class="btn btn-primary btn-sm" onclick="DiaryPage.showAddEntry(${practiceId})"><i class="fas fa-plus"></i> ${I18N.t('add_entry')}</button>` : ''}
          </div>
        </div>

        ${data.entries.length > 0 ? data.entries.map(e => `
          <div class="diary-entry">
            <div class="diary-date">
              <i class="fas fa-calendar-day"></i> ${e.entry_date}
              <span class="status status-${e.status}" style="margin-left:8px;">${I18N.t('status_' + e.status) || e.status}</span>
            </div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">${e.practice_title} — ${e.discipline}</div>
            <div class="diary-content">${e.work_description}</div>
            ${e.skills ? `<div class="diary-skills">${e.skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div>` : ''}
            <div class="diary-footer">
              <span style="font-size:0.8rem;color:var(--text-secondary);"><i class="fas fa-clock"></i> ${e.hours || 0} ч.</span>
              <div class="btn-group">
                ${role === 'partner' && e.status === 'submitted' ? `
                  <button class="btn btn-sm btn-success" onclick="DiaryPage.confirm(${e.id},'confirm')"><i class="fas fa-check"></i> Подтвердить</button>
                  <button class="btn btn-sm btn-danger" onclick="DiaryPage.confirm(${e.id},'reject')"><i class="fas fa-times"></i> Отклонить</button>
                ` : ''}
                ${role === 'admin' && e.status === 'partner_confirmed' ? `
                  <button class="btn btn-sm btn-success" onclick="DiaryPage.approve(${e.id},'approve')"><i class="fas fa-stamp"></i> Утвердить</button>
                  <button class="btn btn-sm btn-danger" onclick="DiaryPage.approve(${e.id},'reject')"><i class="fas fa-times"></i> Отклонить</button>
                ` : ''}
                ${role === 'student' && e.status !== 'admin_approved' ? `
                  <button class="btn btn-sm btn-secondary" onclick="DiaryPage.editEntry(${e.id})"><i class="fas fa-edit"></i></button>
                ` : ''}
              </div>
            </div>
            ${e.remarks ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--warning);"><i class="fas fa-exclamation-triangle"></i> ${e.remarks}</div>` : ''}
          </div>
        `).join('') : '<div class="empty-state"><i class="fas fa-book-open"></i><h3>Нет записей</h3><p>Начните заполнять дневник практики</p></div>'}
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const DiaryPage = {
  showAddEntry(practiceId) {
    App.showModal(`
      <h3 style="margin-bottom:20px;"><i class="fas fa-plus" style="color:var(--primary)"></i> Новая запись в дневнике</h3>
      <div class="form-group"><label class="form-label">${I18N.t('entry_date')} *</label><input type="date" class="form-input" id="diaryDate" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">${I18N.t('work_description')} *</label><textarea class="form-textarea" id="diaryDesc" placeholder="Опишите выполненные работы..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${I18N.t('skills')}</label><input class="form-input" id="diarySkills" placeholder="Python, SQL, Git"></div>
        <div class="form-group"><label class="form-label">${I18N.t('hours')}</label><input type="number" class="form-input" id="diaryHours" value="8"></div>
      </div>
      <div class="form-group"><label class="form-label">${I18N.t('remarks')}</label><textarea class="form-textarea" id="diaryRemarks" placeholder="Замечания (если есть)..." style="min-height:60px;"></textarea></div>
      <input type="hidden" id="diaryPracticeId" value="${practiceId}">
      <button class="btn btn-primary" onclick="DiaryPage.saveEntry()"><i class="fas fa-save"></i> ${I18N.t('save')}</button>
    `);
  },

  async saveEntry() {
    try {
      await API.post('/diary', {
        practice_id: parseInt(document.getElementById('diaryPracticeId').value),
        entry_date: document.getElementById('diaryDate').value,
        work_description: document.getElementById('diaryDesc').value,
        skills: document.getElementById('diarySkills').value,
        hours: parseFloat(document.getElementById('diaryHours').value) || 0,
        remarks: document.getElementById('diaryRemarks').value,
      });
      App.closeModal();
      App.showToast('Запись добавлена!', 'success');
      Router.handleRoute();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async confirm(entryId, action) {
    try {
      await API.put(`/diary/${entryId}/confirm`, { action });
      App.showToast(action === 'confirm' ? 'Запись подтверждена' : 'Запись отклонена', 'success');
      Router.handleRoute();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async approve(entryId, action) {
    try {
      await API.put(`/diary/${entryId}/approve`, { action });
      App.showToast(action === 'approve' ? 'Запись утверждена' : 'Запись отклонена', 'success');
      Router.handleRoute();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  editEntry(id) {
    App.showToast('Редактирование записи #' + id, 'info');
  },

  exportPDF() {
    const el = document.createElement('div');
    
    // Сбор всех записей из DOM для PDF
    let entriesHTML = '';
    document.querySelectorAll('.diary-entry').forEach(entry => {
      const date = entry.querySelector('.diary-date').innerText.split('\n')[0].replace('✓','').trim();
      const content = entry.querySelector('.diary-content').innerText;
      const skills = entry.querySelector('.diary-skills') ? entry.querySelector('.diary-skills').innerText : '';
      entriesHTML += `<div style="margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid #eee;">
        <strong>${date}</strong>
        <p>${content}</p>
        ${skills ? `<p><em>Навыки: ${skills}</em></p>` : ''}
      </div>`;
    });

    el.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#000;">
        <h2 style="text-align:center;margin-bottom:30px;">ЭЛЕКТРОННЫЙ ДНЕВНИК ПРАКТИКИ</h2>
        <div style="font-size:12px;margin-bottom:20px;">Студент: <strong>${Auth.user.full_name}</strong> | Группа: ${Auth.user.group_name || '—'}</div>
        ${entriesHTML}
        ${entriesHTML === '' ? '<p>Нет записей для экспорта</p>' : ''}
        
        <div style="margin-top:60px; padding:20px; border:2px double #2c3e50; border-radius:10px; background:#f9f9f9; display:flex; gap:20px; align-items:center;">
          <div style="width:80px; height:80px; background:#ddd; display:flex; align-items:center; justify-content:center; border:1px solid #999; font-size:10px; text-align:center;">QR CODE SIMULATION</div>
          <div>
            <div style="font-weight:700; color:#2c3e50; margin-bottom:5px;">ДОКУМЕНТ ПОДПИСАН ЭЦП</div>
            <div style="font-size:11px; line-height:1.4;">
              <div>Сертификат: 00b3e7a1c902f8d4e5a6b7c8d9e0f1a2</div>
              <div>Владелец: ГК "ПРАВИТЕЛЬСТВО ДЛЯ ГРАЖДАН" (УЦ ГО)</div>
              <div>Подписант: Администрация PractDay AI</div>
              <div>Дата: ${new Date().toLocaleString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const opt = { margin: 0.5, filename: 'Дневник_практики.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(el).save();
    App.showToast('Генерация PDF начата...', 'info');
  }
};
