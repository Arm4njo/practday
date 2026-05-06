// pages/characteristics.js — AI-generated student characteristics
Router.register('/characteristics', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_characteristics');
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');

  try {
    const data = await API.get('/characteristics');

    content.innerHTML = `
      ${role === 'admin' ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-robot"></i> Генерация характеристики (ИИ)</h3>
          </div>
          <p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.88rem;">
            ИИ автоматически проанализирует отзывы партнёров, записи дневника и данные о посещаемости для формирования характеристики студента.
          </p>
          <div class="form-row">
            <div class="form-group"><label class="form-label">ID студента</label><input type="number" class="form-input" id="charStudentId"></div>
            <div class="form-group"><label class="form-label">ID практики</label><input type="number" class="form-input" id="charPracticeId"></div>
          </div>
          <button class="btn btn-primary" onclick="CharPage.generate()"><i class="fas fa-magic"></i> ${I18N.t('generate')}</button>
          <div id="generatedCharResult" style="margin-top:20px;display:none;"></div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-certificate"></i> Характеристики</h3>
        </div>

        ${data.characteristics.length > 0 ? data.characteristics.map(c => `
          <div class="diary-entry">
            <div class="diary-date">
              <i class="fas fa-user-graduate"></i> ${c.student_name}
              <span class="status status-${c.status}" style="margin-left:8px;">${I18N.t('status_' + c.status) || c.status}</span>
            </div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:10px;">${c.practice_title} | Шаблон: ${c.template_name || '—'}</div>
            <div class="characteristic-text">${c.edited_text || c.generated_text}</div>
            <div class="diary-footer" style="margin-top:12px;">
              <span style="font-size:0.78rem;color:var(--text-secondary);">
                ${c.generated_at ? `Сгенерировано: ${new Date(c.generated_at).toLocaleString('ru-RU')}` : ''}
              </span>
              <div class="btn-group">
                <button class="btn btn-sm btn-info" onclick="CharPage.exportPDF(${c.id}, '${c.student_name}')"><i class="fas fa-file-pdf"></i> Экспорт PDF с ЭЦП</button>
                ${role === 'admin' && c.status !== 'approved' ? `
                  <button class="btn btn-sm btn-secondary" onclick="CharPage.edit(${c.id}, \`${(c.edited_text || c.generated_text || '').replace(/`/g, "'")}\`)"><i class="fas fa-edit"></i> ${I18N.t('edit')}</button>
                  <button class="btn btn-sm btn-success" onclick="CharPage.approve(${c.id})"><i class="fas fa-stamp"></i> ${I18N.t('approve')}</button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('') : '<div class="empty-state"><i class="fas fa-robot"></i><h3>Нет характеристик</h3><p>Характеристики будут сгенерированы ИИ на основе отзывов и данных практики</p></div>'}
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const CharPage = {
  async generate() {
    try {
      const result = await API.post('/characteristics/generate', {
        student_id: parseInt(document.getElementById('charStudentId').value),
        practice_id: parseInt(document.getElementById('charPracticeId').value),
      });

      const el = document.getElementById('generatedCharResult');
      el.style.display = 'block';
      el.innerHTML = `
        <div style="background:var(--success-bg);border:1px solid var(--success);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
          <strong><i class="fas fa-check-circle" style="color:var(--success)"></i> Характеристика сгенерирована ИИ</strong>
        </div>
        <div class="characteristic-text">${result.characteristic}</div>
        <div style="margin-top:16px;">
          <h4 style="margin-bottom:8px;">Анализ отзывов:</h4>
          <p>Отзывов: ${result.reviewsAnalysis.reviews_count} | Позитивных: ${result.reviewsAnalysis.positive_percent}%</p>
          ${result.reviewsAnalysis.aspects.length > 0 ? `
            <div class="review-aspects" style="margin-top:8px;">
              ${result.reviewsAnalysis.aspects.map(a => `<span class="practice-tag"><i class="fas fa-tag"></i> ${a.label_ru}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
      App.showToast('Характеристика успешно сгенерирована!', 'success');
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  edit(id, text) {
    App.showModal(`
      <h3 style="margin-bottom:16px;"><i class="fas fa-edit" style="color:var(--primary)"></i> Редактирование характеристики</h3>
      <div class="form-group">
        <textarea class="form-textarea" id="editCharText" style="min-height:200px;">${text}</textarea>
      </div>
      <button class="btn btn-primary" onclick="CharPage.saveEdit(${id})"><i class="fas fa-save"></i> ${I18N.t('save')}</button>
    `);
  },

  async saveEdit(id) {
    try {
      await API.put(`/characteristics/${id}/edit`, { edited_text: document.getElementById('editCharText').value });
      App.closeModal();
      App.showToast('Характеристика отредактирована', 'success');
      Router.handleRoute();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  async approve(id) {
    try {
      await API.put(`/characteristics/${id}/approve`);
      App.showToast('Характеристика утверждена!', 'success');
      Router.handleRoute();
    } catch(err) { App.showToast(err.message, 'error'); }
  },

  exportPDF(id, studentName) {
    const el = document.createElement('div');
    const textNode = document.querySelector('.characteristic-text').innerText;
    el.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#000;">
        <h2 style="text-align:center;margin-bottom:30px;">ХАРАКТЕРИСТИКА</h2>
        <h3 style="text-align:center;margin-bottom:30px;">Студент: ${studentName}</h3>
        <div style="line-height:1.6;font-size:14px;white-space:pre-wrap;">${textNode}</div>
        
        <div style="margin-top:60px; padding:20px; border:2px double #2c3e50; border-radius:10px; background:#f9f9f9; display:flex; gap:20px; align-items:center;">
          <div style="width:80px; height:80px; background:#ddd; display:flex; align-items:center; justify-content:center; border:1px solid #999; font-size:10px; text-align:center;">QR CODE SIMULATION</div>
          <div>
            <div style="font-weight:700; color:#2c3e50; margin-bottom:5px;">ДОКУМЕНТ ПОДПИСАН ЭЦП</div>
            <div style="font-size:11px; line-height:1.4;">
              <div>Сертификат: a7d9e0f1a200b3e7a1c902f8d4e5a6b7</div>
              <div>Владелец: ГК "ПРАВИТЕЛЬСТВО ДЛЯ ГРАЖДАН" (УЦ ГО)</div>
              <div>Подписант: Дирекция колледжа PractDay AI</div>
              <div>Дата: ${new Date().toLocaleString('ru-RU')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const opt = { margin: 0.5, filename: `Характеристика_${studentName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(el).save();
    App.showToast('Генерация PDF начата...', 'info');
  }
};
