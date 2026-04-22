// pages/reviews.js — Partner reviews with AI analysis
Router.register('/reviews', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_reviews');
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');

  try {
    const data = await API.get('/reviews');

    content.innerHTML = `
      ${role === 'partner' ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-star"></i> ${I18N.t('add_review')}</h3></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">ID студента</label><input type="number" class="form-input" id="reviewStudentId"></div>
            <div class="form-group"><label class="form-label">ID практики</label><input type="number" class="form-input" id="reviewPracticeId"></div>
          </div>
          <div class="form-group"><label class="form-label">${I18N.t('review_text')}</label>
            <textarea class="form-textarea" id="reviewText" placeholder="Напишите отзыв о студенте. Например: Ответственный студент, быстро обучается, демонстрирует высокий уровень дисциплины и инициативности..."></textarea>
          </div>
          <button class="btn btn-primary" onclick="ReviewsPage.submit()"><i class="fas fa-paper-plane"></i> Отправить отзыв</button>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-comments"></i> Отзывы</h3>
        </div>

        ${data.reviews.length > 0 ? data.reviews.map(r => {
          let aspects = [];
          try { aspects = JSON.parse(r.key_aspects || '[]'); } catch(e) {}
          const sentimentColors = { positive: 'var(--success)', negative: 'var(--danger)', neutral: 'var(--text-secondary)' };
          const sentimentLabels = { positive: I18N.t('positive'), negative: I18N.t('negative'), neutral: I18N.t('neutral') };
          return `
            <div class="review-card">
              <div class="review-header">
                <div>
                  <div class="review-author"><i class="fas fa-user-graduate"></i> ${r.student_name}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);">${r.practice_title} — от ${r.partner_name}</div>
                </div>
                <div style="text-align:right;">
                  <span class="status status-${r.sentiment_label}">${sentimentLabels[r.sentiment_label] || r.sentiment_label}</span>
                  <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">Оценка: ${r.sentiment_score}%</div>
                </div>
              </div>
              <div class="review-text">"${r.review_text}"</div>
              ${aspects.length > 0 ? `
                <div class="review-aspects">
                  ${aspects.map(a => `<span class="practice-tag"><i class="fas fa-tag"></i> ${a.label_ru} (${a.mentions})</span>`).join('')}
                </div>
              ` : ''}
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:8px;">${new Date(r.created_at).toLocaleString('ru-RU')}</div>
            </div>
          `;
        }).join('') : '<div class="empty-state"><i class="fas fa-star"></i><h3>Нет отзывов</h3><p>Социальные партнёры ещё не оставили отзывов</p></div>'}
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const ReviewsPage = {
  async submit() {
    try {
      const result = await API.post('/reviews', {
        student_id: parseInt(document.getElementById('reviewStudentId').value),
        practice_id: parseInt(document.getElementById('reviewPracticeId').value),
        review_text: document.getElementById('reviewText').value,
      });
      App.showToast(`Отзыв сохранён! Тональность: ${result.sentiment.label} (${result.sentiment.positivePercent}% положительных)`, 'success');
      Router.navigate('/reviews');
    } catch(err) { App.showToast(err.message, 'error'); }
  }
};
