// pages/partner_students.js — Student management for social partners
Router.register('/partner/students', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = 'Мои студенты';
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');

  if (role !== 'partner' && role !== 'admin') {
    content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Доступ запрещён</h3></div>';
    return;
  }

  try {
    const data = await API.get('/practices/applications/all?status=approved');
    const students = data.applications || [];

    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-user-graduate"></i> Студенты на практике</h3>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Студент</th>
                <th>Группа</th>
                <th>Практика</th>
                <th>Дисциплина</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td><strong>${s.student_name}</strong></td>
                  <td>${s.group_name || '—'}</td>
                  <td>${s.practice_title}</td>
                  <td>${s.discipline}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-info" title="Дневник" onclick="Router.navigate('/diary?practice_id=${s.practice_id}&student_id=${s.student_id}')">
                        <i class="fas fa-book"></i>
                      </button>
                      <button class="btn btn-sm btn-success" title="Посещаемость" onclick="Router.navigate('/attendance?practice_id=${s.practice_id}&student_id=${s.student_id}')">
                        <i class="fas fa-map-marker-alt"></i>
                      </button>
                      <button class="btn btn-sm btn-primary" title="Оставить отзыв" onclick="Router.navigate('/reviews?student_id=${s.student_id}&practice_id=${s.practice_id}')">
                        <i class="fas fa-comment-dots"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${students.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">У вас пока нет закреплённых студентов</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;background:var(--info-bg);">
        <h4 style="margin-bottom:12px;"><i class="fas fa-info-circle"></i> Инструкция для партнёра</h4>
        <ul style="font-size:0.88rem;color:var(--text-secondary);line-height:1.6;margin-left:20px;">
          <li>Используйте иконку <i class="fas fa-book"></i> для проверки и подтверждения записей в дневнике.</li>
          <li>Используйте иконку <i class="fas fa-map-marker-alt"></i> для подтверждения ежедневного присутствия.</li>
          <li>Используйте иконку <i class="fas fa-comment-dots"></i> для написания финального отзыва, на основе которого ИИ сформирует характеристику.</li>
        </ul>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});
