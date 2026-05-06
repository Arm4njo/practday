// pages/chat.js — Feedback and Messaging
Router.register('/chat', async (params) => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_chat');
  const role = Auth.getRole();
  const content = document.getElementById('contentArea');
  const practiceId = params.practice_id || new URLSearchParams(window.location.hash.split('?')[1]).get('practice_id');

  try {
    const query = practiceId ? `?practice_id=${practiceId}` : '';
    const data = await API.get('/chat/messages' + query);

    content.innerHTML = `
      <div class="chat-container card">
        <div class="chat-header">
          <h3 class="card-title"><i class="fas fa-comments"></i> Обратная связь</h3>
          <span style="font-size:0.85rem;color:var(--text-secondary);">Чат по практике</span>
        </div>
        
        <div class="chat-messages" id="chatMessages">
          ${data.messages.map(m => `
            <div class="message ${m.sender_id === Auth.user.id ? 'message-own' : ''}">
              <div class="message-info">
                <strong>${m.sender_name}</strong> 
                <span class="status status-xs status-${m.sender_role === 'admin' ? 'approved' : 'confirmed'}">${m.sender_role}</span>
              </div>
              <div class="message-text">${m.message_text}</div>
              <div class="message-time">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          `).join('')}
          ${data.messages.length === 0 ? '<div class="empty-state">Нет сообщений. Начните диалог!</div>' : ''}
        </div>
        
        <div class="chat-input-area">
          <input type="text" class="form-input" id="chatInput" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter') ChatPage.sendMessage(${practiceId || 'null'})">
          <button class="btn btn-primary" onclick="ChatPage.sendMessage(${practiceId || 'null'})"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    `;
    
    // Scroll to bottom
    const msgDiv = document.getElementById('chatMessages');
    msgDiv.scrollTop = msgDiv.scrollHeight;

  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const ChatPage = {
  async sendMessage(practiceId) {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    try {
      await API.post('/chat/messages', { practice_id: practiceId, message_text: text });
      input.value = '';
      Router.handleRoute(); // Refresh
    } catch(err) { App.showToast(err.message, 'error'); }
  }
};
