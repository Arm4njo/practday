// pages/login.js — Login page
Router.register('/login', async () => {
  const content = document.getElementById('contentArea');
  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = 'none';
  document.querySelector('.main-content').style.marginLeft = '0';
  document.querySelector('.top-bar').style.display = 'none';

  content.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">
          <i class="fas fa-graduation-cap"></i>
          <h2>PractDay <em style="background:linear-gradient(135deg,#06b6d4,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AI</em></h2>
          <p data-i18n="loading">Система управления практикой</p>
        </div>

        <div class="login-tabs">
          <button class="login-tab active" id="loginTab" onclick="LoginPage.showLogin()">${I18N.t('login')}</button>
          <button class="login-tab" id="registerTab" onclick="LoginPage.showRegister()">${I18N.t('register')}</button>
        </div>

        <div id="loginForm">
          <div class="form-group">
            <label class="form-label">${I18N.t('email')}</label>
            <input type="email" class="form-input" id="loginEmail" placeholder="admin@practday.kz" value="admin@practday.kz">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('password')}</label>
            <input type="password" class="form-input" id="loginPassword" placeholder="Пароль" value="admin123">
          </div>
          <button class="btn btn-primary btn-lg" style="width:100%;justify-content:center;" onclick="LoginPage.doLogin()">
            <i class="fas fa-sign-in-alt"></i> ${I18N.t('login')}
          </button>
          <p style="text-align:center;margin-top:16px;">
            <a href="#" onclick="LoginPage.showForgotPassword();return false;" style="font-size:0.85rem;color:var(--text-secondary);">${I18N.t('forgot_password')}</a>
          </p>
          <div style="margin-top:20px;padding:16px;background:var(--info-bg);border-radius:8px;font-size:0.78rem;color:var(--text-secondary);">
            <strong>Демо-аккаунт:</strong><br>
            Email: admin@practday.kz<br>
            Пароль: admin123
          </div>
        </div>

        <div id="registerForm" style="display:none;">
          <div class="form-group">
            <label class="form-label">${I18N.t('full_name')} *</label>
            <input type="text" class="form-input" id="regName" placeholder="Иванов Иван Иванович">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('email')} *</label>
            <input type="email" class="form-input" id="regEmail" placeholder="student@mail.kz">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('phone')}</label>
            <input type="tel" class="form-input" id="regPhone" placeholder="+77001234567">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('password')} *</label>
            <input type="password" class="form-input" id="regPassword" placeholder="Минимум 6 символов">
          </div>
          <div class="form-group">
            <label class="form-label">${I18N.t('role')} *</label>
            <select class="form-select" id="regRole" onchange="LoginPage.toggleRoleFields()">
              <option value="student">${I18N.t('role_student')}</option>
              <option value="partner">${I18N.t('role_partner')}</option>
            </select>
          </div>
          <div id="studentFields">
            <div class="form-group">
              <label class="form-label">${I18N.t('group')}</label>
              <input type="text" class="form-input" id="regGroup" placeholder="ИС-21-1">
            </div>
            <div class="form-group">
              <label class="form-label">${I18N.t('specialty')}</label>
              <input type="text" class="form-input" id="regSpecialty" placeholder="Информационные системы">
            </div>
          </div>
          <div id="partnerFields" style="display:none;">
            <div class="form-group">
              <label class="form-label">${I18N.t('organization')}</label>
              <input type="text" class="form-input" id="regOrg" placeholder="Название организации">
            </div>
          </div>
          <button class="btn btn-primary btn-lg" style="width:100%;justify-content:center;" onclick="LoginPage.doRegister()">
            <i class="fas fa-user-plus"></i> ${I18N.t('register')}
          </button>
        </div>
      </div>
    </div>
  `;
});

const LoginPage = {
  showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
  },

  showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
  },

  toggleRoleFields() {
    const role = document.getElementById('regRole').value;
    document.getElementById('studentFields').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('partnerFields').style.display = role === 'partner' ? 'block' : 'none';
  },

  async doLogin() {
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const data = await API.post('/auth/login', { email, password });
      Auth.login(data.token, data.user);
      App.showToast('Вход выполнен успешно!', 'success');
      Router.navigate('/dashboard');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async doRegister() {
    try {
      const data = await API.post('/auth/register', {
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
        group_name: document.getElementById('regGroup')?.value,
        specialty: document.getElementById('regSpecialty')?.value,
        organization: document.getElementById('regOrg')?.value,
      });
      Auth.login(data.token, data.user);
      App.showToast('Регистрация успешна!', 'success');
      Router.navigate('/dashboard');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  showForgotPassword() {
    App.showModal(`
      <h3 style="margin-bottom:16px;">Восстановление пароля</h3>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="resetEmail" placeholder="Введите ваш email">
      </div>
      <button class="btn btn-primary" onclick="LoginPage.resetPassword()">Отправить ссылку</button>
    `);
  },

  async resetPassword() {
    try {
      const email = document.getElementById('resetEmail').value;
      await API.post('/auth/forgot-password', { email });
      App.showToast('Ссылка для восстановления отправлена на email', 'success');
      App.closeModal();
    } catch(err) {
      App.showToast(err.message, 'error');
    }
  }
};
