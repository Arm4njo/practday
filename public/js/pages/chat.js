// pages/chat.js — Chat / feedback system
Router.register('/chat', async () => {
  App.restoreLayout();
  document.getElementById('pageTitle').textContent = I18N.t('nav_chat');
  const content = document.getElementById('contentArea');

  try {
    const msgData = await API.get('/reports/messages');
    let users = [];
    if (Auth.getRole() === 'admin') {
      const u = await API.get('/auth/users');
      users = u.users;
    }

    content.innerHTML = `
      <div class="chat-container">
        <div class="chat-users">
          <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-weight:700;font-size:0.9rem;">
            <i class="fas fa-users"></i> Контакты
          </div>
          ${users.length > 0 ? users.filter(u => u.id !== Auth.user.id).map(u => `
            <div class="chat-user-item" onclick="ChatPage.selectUser(${u.id}, '${u.full_name}')">
              <div class="name">${u.full_name}</div>
              <div class="role">${u.role === 'student' ? 'Студент' : u.role === 'partner' ? 'Партнёр' : u.role === 'admin' ? 'Админ' : u.role} ${u.group_name ? '| ' + u.group_name : ''}</div>
            </div>
          `).join('') : '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:0.85rem;">Контакты загружаются...</div>'}
        </div>

        <div class="chat-messages-area">
          <div style="padding:14px 20px;border-bottom:1px solid var(--border);font-weight:700;font-size:0.9rem;" id="chatTitle">
            <i class="fas fa-comments"></i> Чат
          </div>
          <div class="chat-messages" id="chatMessages">
            ${msgData.messages.length > 0 ? msgData.messages.reverse().map(m => `
              <div class="chat-msg ${m.sender_id === Auth.user.id ? 'sent' : 'received'}">
                <div class="chat-msg-name">${m.sender_name}</div>
                ${m.message_text}
                <div class="chat-msg-time">${new Date(m.created_at).toLocaleString('ru-RU')}</div>
              </div>
            `).join('') : '<div class="empty-state" style="padding:40px;"><i class="fas fa-comment-dots"></i><h3>Нет сообщений</h3><p>Выберите контакт и начните общение</p></div>'}
          </div>
          <div class="chat-input-area">
            <input type="text" class="form-input" id="chatInput" placeholder="Введите сообщение..." onkeydown="if(event.key==='Enter')ChatPage.send()">
            <button class="btn btn-primary" onclick="ChatPage.send()"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
  }
});

const ChatPage = {
  selectedUserId: null,
  selectedUserName: '',

  selectUser(userId, userName) {
    this.selectedUserId = userId;
    this.selectedUserName = userName;
    document.getElementById('chatTitle').innerHTML = `<i class="fas fa-comments"></i> ${userName}`;

    // Highlight selected
    document.querySelectorAll('.chat-user-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Load messages for this user
    this.loadMessages(userId);
  },

  async loadMessages(userId) {
    try {
      const data = await API.get(`/reports/messages?other_user_id=${userId}`);
      const el = document.getElementById('chatMessages');
      if (data.messages.length > 0) {
        el.innerHTML = data.messages.reverse().map(m => `
          <div class="chat-msg ${m.sender_id === Auth.user.id ? 'sent' : 'received'}">
            <div class="chat-msg-name">${m.sender_name}</div>
            ${m.message_text}
            <div class="chat-msg-time">${new Date(m.created_at).toLocaleString('ru-RU')}</div>
          </div>
        `).join('');
        el.scrollTop = el.scrollHeight;
      } else {
        el.innerHTML = '<div class="empty-state" style="padding:40px;"><i class="fas fa-comment-dots"></i><p>Нет сообщений</p></div>';
      }
    } catch(err) { console.error(err); }
  },

  async send() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    try {
      await API.post('/reports/messages', {
        receiver_id: this.selectedUserId,
        message_text: text,
      });
      input.value = '';

      // Add message to UI
      const el = document.getElementById('chatMessages');
      el.innerHTML += `
        <div class="chat-msg sent">
          <div class="chat-msg-name">${Auth.user.full_name}</div>
          ${text}
          <div class="chat-msg-time">Только что</div>
        </div>
      `;
      el.scrollTop = el.scrollHeight;
    } catch(err) { App.showToast(err.message, 'error'); }
  }
};
