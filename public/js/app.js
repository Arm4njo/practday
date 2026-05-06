// app.js — Main application logic & UI orchestration
const App = {
  async init() {
    // Init modules
    Auth.init();
    I18N.setLang(I18N.currentLang);
    Router.init();

    // Event Listeners
    document.getElementById('logoutBtn').addEventListener('click', () => {
      Auth.logout();
      Router.navigate('/login');
    });

    document.getElementById('sidebarToggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const mainContent = document.getElementById('mainContent');
      sidebar.style.width = sidebar.style.width === '70px' ? '260px' : '70px';
      mainContent.style.marginLeft = sidebar.style.width === '70px' ? '70px' : '260px';
      sidebar.classList.toggle('collapsed');
      document.querySelectorAll('.nav-item span:not(.badge-nav), .logo span').forEach(el => {
        el.style.display = sidebar.style.width === '70px' ? 'none' : 'block';
      });
      document.querySelectorAll('.nav-section-title').forEach(el => {
        el.style.display = sidebar.style.width === '70px' ? 'none' : 'block';
      });
    });

    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('open');
      if (sidebar.classList.contains('open')) {
        sidebar.style.transform = 'translateX(0)';
      } else {
        sidebar.style.transform = 'translateX(-100%)';
      }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        I18N.setLang(e.target.dataset.lang);
        App.updateNav();
        Router.handleRoute(); // re-render current page
      });
    });

    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') this.closeModal();
    });

    document.getElementById('notificationsBell').addEventListener('click', () => {
      const panel = document.getElementById('notificationsPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') this.loadNotifications();
    });

    document.getElementById('readAllNotifs').addEventListener('click', async () => {
      try {
        await API.put('/reports/notifications/read-all');
        this.loadNotifications();
      } catch (e) { }
    });

    // Start App
    Router.handleRoute();

    // Poll notifications if logged in
    if (Auth.isLoggedIn()) {
      this.checkUnreadNotifications();
      setInterval(() => this.checkUnreadNotifications(), 30000); // Every 30s
    }
  },

  restoreLayout() {
    document.getElementById('sidebar').style.display = 'flex';
    document.querySelector('.main-content').style.marginLeft = window.innerWidth > 1024 ? '260px' : '0';
    document.querySelector('.top-bar').style.display = 'flex';
    Auth.updateUI();
    this.updateNav();

    // Verification Banner
    const bannerId = 'verificationBanner';
    let banner = document.getElementById(bannerId);
    if (Auth.isLoggedIn() && !Auth.user.is_verified) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = bannerId;
        banner.style = 'background:var(--warning-bg);color:var(--warning);padding:10px 20px;font-size:0.85rem;border-bottom:1px solid var(--warning);display:flex;align-items:center;gap:10px;';
        banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ваш аккаунт ожидает верификации администратором. Некоторые функции могут быть ограничены.`;
        document.querySelector('.main-content').prepend(banner);
      }
    } else if (banner) {
      banner.remove();
    }
  },

  updateNav() {
    const nav = document.getElementById('sidebarNav');
    if (!Auth.isLoggedIn()) {
      nav.innerHTML = '';
      return;
    }

    const role = Auth.getRole();
    let html = '';

    // Секция "ОСНОВНЫЕ"
    html += `<div class="nav-section-title" data-i18n="nav_section_main">${I18N.t('nav_section_main')}</div>`;
    html += this.createNavItem('/dashboard', 'fas fa-home', 'nav_dashboard');
    html += this.createNavItem('/practices', 'fas fa-briefcase', 'nav_practices');
    if (role === 'student' || role === 'partner' || role === 'admin') {
      html += this.createNavItem('/attendance', 'fas fa-map-marker-alt', 'nav_attendance');
      html += this.createNavItem('/diary', 'fas fa-book', 'nav_diary');
    }
    if (role === 'partner') {
      html += this.createNavItem('/partner/students', 'fas fa-user-graduate', 'nav_my_students');
    }
    if (role === 'student') {
      html += this.createNavItem('/student/practice', 'fas fa-rocket', 'nav_my_practice');
    }

    // Секция "ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ"
    html += `<div class="nav-section-title" data-i18n="nav_section_ai">${I18N.t('nav_section_ai')}</div>`;
    html += this.createNavItem('/reviews', 'fas fa-star', 'nav_reviews');
    html += this.createNavItem('/characteristics', 'fas fa-robot', 'nav_characteristics');

    // Секция "АДМИНИСТРИРОВАНИЕ" (только админ)
    if (role === 'admin') {
      html += `<div class="nav-section-title" data-i18n="nav_section_admin">${I18N.t('nav_section_admin')}</div>`;
      html += this.createNavItem('/users', 'fas fa-users', 'nav_users');
      html += this.createNavItem('/reports', 'fas fa-chart-line', 'nav_reports');
    }

    // Общее
    html += `<div class="nav-section-title" data-i18n="nav_section_other">${I18N.t('nav_section_other') || 'СВЯЗЬ'}</div>`;
    html += this.createNavItem('/chat', 'fas fa-comments', 'nav_chat');

    nav.innerHTML = html;

    // Highlight current
    const currentPath = Router.currentRoute;
    nav.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.route === currentPath || (currentPath.startsWith(item.dataset.route) && item.dataset.route !== '/dashboard')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile menu on navigate
    if (window.innerWidth <= 1024) {
      document.getElementById('sidebar').style.transform = 'translateX(-100%)';
      document.getElementById('sidebar').classList.remove('open');
    }
  },

  createNavItem(route, iconClass, i18nKey) {
    return `
      <a href="#${route}" class="nav-item" data-route="${route}">
        <i class="${iconClass}"></i>
        <span data-i18n="${i18nKey}">${I18N.t(i18nKey)}</span>
      </a>
    `;
  },

  async checkUnreadNotifications() {
    try {
      const data = await API.get('/reports/notifications');
      const unread = data.notifications.filter(n => !n.is_read).length;
      const badge = document.getElementById('notifBadge');
      if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { }
  },

  async loadNotifications() {
    const list = document.getElementById('notifList');
    list.innerHTML = '<div style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
      const data = await API.get('/reports/notifications');
      this.checkUnreadNotifications();
      if (data.notifications.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:30px 20px;"><p>${I18N.t('no_notifications')}</p></div>`;
        return;
      }
      list.innerHTML = data.notifications.map(n => `
        <div class="notif-item ${!n.is_read ? 'unread' : ''}">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-message">${n.message}</div>
          <div class="notif-item-time">${new Date(n.created_at).toLocaleString('ru-RU')}</div>
        </div>
      `).join('');
    } catch (err) {
      list.innerHTML = `<div style="padding:20px;color:var(--danger);">${err.message}</div>`;
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s reverse';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showModal(contentHTML) {
    document.getElementById('modalBody').innerHTML = contentHTML;
    document.getElementById('modalOverlay').style.display = 'flex';
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modalBody').innerHTML = '';
  }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
