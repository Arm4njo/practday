// auth.js — Client-side auth module
const Auth = {
  user: null,

  init() {
    const token = localStorage.getItem('practday_token');
    const userData = localStorage.getItem('practday_user');
    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
      } catch(e) {
        this.logout();
      }
    }
  },

  isLoggedIn() {
    return !!this.user && !!localStorage.getItem('practday_token');
  },

  getRole() {
    return this.user?.role || 'guest';
  },

  login(token, user) {
    localStorage.setItem('practday_token', token);
    localStorage.setItem('practday_user', JSON.stringify(user));
    this.user = user;
  },

  logout() {
    localStorage.removeItem('practday_token');
    localStorage.removeItem('practday_user');
    this.user = null;
  },

  updateUI() {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');

    if (this.isLoggedIn()) {
      userInfo.style.display = 'flex';
      userName.textContent = this.user.full_name;
      const roleNames = { admin: 'Администратор', student: 'Студент', partner: 'Партнёр', guest: 'Гость' };
      userRole.textContent = roleNames[this.user.role] || this.user.role;
      userAvatar.textContent = this.user.full_name.charAt(0).toUpperCase();
    } else {
      userInfo.style.display = 'none';
    }
  }
};
