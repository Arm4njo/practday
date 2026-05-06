// pages/student_practice.js — Student's active practice cockpit
Router.register('/student/practice', async (params) => {
  App.restoreLayout();
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');
  const practiceId = params.id || new URLSearchParams(window.location.hash.split('?')[1]).get('id');

  if (role !== 'student' && role !== 'admin') {
    content.innerHTML = '<div class="empty-state"><h3>Доступ запрещён</h3></div>';
    return;
  }

  try {
    // Получаем детали практики и статус посещаемости
    const appData = await API.get(`/practices/applications/my`);
    const app = appData.applications.find(a => a.practice_id == practiceId || a.id == practiceId);

    if (!app || app.status !== 'approved') {
      content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-briefcase"></i>
          <h3>Практика не найдена или не утверждена</h3>
          <p>Пожалуйста, выберите практику из каталога или дождитесь одобрения заявки.</p>
          <button class="btn btn-primary" onclick="Router.navigate('/dashboard')">Вернуться на главную</button>
        </div>
      `;
      return;
    }

    document.getElementById('pageTitle').textContent = app.title;

    // Сводка по посещаемости и дневнику
    const attendanceSummary = await API.get(`/attendance/summary?practice_id=${app.practice_id}`);
    const diarySummary = await API.get(`/diary/completeness/${app.practice_id}`);
    const charData = await API.get(`/characteristics?practice_id=${app.practice_id}`);

    const att = attendanceSummary.summary;
    const diary = diarySummary.completeness;
    const char = charData.characteristics[0];

    content.innerHTML = `
      <div class="cockpit-grid">
        <!-- Левая колонка: Основная информация и действия -->
        <div class="cockpit-main">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-info-circle"></i> О практике</h3>
              <span class="status status-approved">Активна</span>
            </div>
            <div class="info-grid" style="margin-top:15px;">
              <div class="info-item"><strong>Организация:</strong> ${app.partner_name || '—'}</div>
              <div class="info-item"><strong>Дисциплина:</strong> ${app.discipline}</div>
              <div class="info-item"><strong>Период:</strong> ${app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'} — ...</div>
              <div class="info-item"><strong>Формат:</strong> ${app.format === 'onsite' ? 'Очно' : 'Заочно'}</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-map-marker-alt"></i> Присутствие сегодня</h3>
            </div>
            <div style="display:flex;gap:15px;align-items:center;margin-top:15px;">
               <button class="btn btn-success btn-lg" onclick="Router.navigate('/attendance?practice_id=${app.practice_id}')">
                 <i class="fas fa-sign-in-alt"></i> Отметиться в журнале
               </button>
               <div style="font-size:0.9rem;color:var(--text-secondary);">
                 Посещаемость: <strong>${att.attendance_percent}%</strong> (${att.present_days} из ${att.total_days} дн.)
               </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-book"></i> Электронный дневник</h3>
              <button class="btn btn-primary btn-sm" onclick="Router.navigate('/diary?practice_id=${app.practice_id}')">Заполнить</button>
            </div>
            <div style="margin-top:15px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;">
                <span>Заполнение РУП:</span>
                <span>${diary.hours_percent}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${diary.hours_percent}%;background:var(--success);"></div>
              </div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:10px;">
                Отработано ${diary.total_hours} из ${diary.required_hours} часов. Записей: ${diary.total_entries}.
              </div>
            </div>
          </div>
        </div>

        <!-- Правая колонка: ИИ и Статус -->
        <div class="cockpit-side">
          <div class="card" style="background:var(--primary-bg);">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-robot"></i> Искусственный интеллект</h3>
            </div>
            <div style="margin-top:15px;">
              <p style="font-size:0.85rem;margin-bottom:15px;">ИИ анализирует ваши успехи и отзывы партнера для формирования итоговой характеристики.</p>
              ${char ? `
                <div class="char-status-box">
                  <div style="font-weight:600;color:var(--primary);margin-bottom:5px;">Характеристика сформирована</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px;">Статус: <span class="status status-${char.status}">${I18N.t('status_'+char.status)}</span></div>
                  <button class="btn btn-secondary btn-sm btn-block" onclick="Router.navigate('/characteristics')">Просмотреть</button>
                </div>
              ` : `
                <div style="padding:15px;border:1px dashed var(--border);border-radius:8px;text-align:center;">
                  <i class="fas fa-hourglass-half" style="font-size:1.5rem;color:var(--text-secondary);margin-bottom:10px;"></i>
                  <div style="font-size:0.85rem;color:var(--text-secondary);">Характеристика будет доступна после завершения практики и анализа отзывов.</div>
                </div>
              `}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-tasks"></i> Текущие задачи</h3>
            </div>
            <ul class="task-list" style="margin-top:15px;list-style:none;padding:0;">
              <li style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:0.9rem;">
                <i class="fas ${att.present_days > 0 ? 'fa-check-circle' : 'fa-circle'}" style="color:${att.present_days > 0 ? 'var(--success)' : 'var(--border)'}"></i>
                Отметиться сегодня
              </li>
              <li style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:0.9rem;">
                <i class="fas ${diary.total_entries > 0 ? 'fa-check-circle' : 'fa-circle'}" style="color:${diary.total_entries > 0 ? 'var(--success)' : 'var(--border)'}"></i>
                Заполнить дневник
              </li>
              <li style="display:flex;align-items:center;gap:10px;font-size:0.9rem;">
                <i class="fas ${diary.is_complete ? 'fa-check-circle' : 'fa-circle'}" style="color:${diary.is_complete ? 'var(--success)' : 'var(--border)'}"></i>
                Покрыть компетенции РУП
              </li>
            </ul>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});
