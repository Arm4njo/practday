// router.js — Client-side SPA router
const Router = {
  routes: {},
  currentRoute: null,

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path) {
    window.location.hash = path;
  },

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const path = hash.split('?')[0];
    const params = {};
    const queryStr = hash.split('?')[1];
    if (queryStr) {
      queryStr.split('&').forEach(p => {
        const [k, v] = p.split('=');
        params[k] = decodeURIComponent(v);
      });
    }

    // Auth check
    const publicRoutes = ['/login', '/register', '/guest'];
    if (!Auth.isLoggedIn() && !publicRoutes.includes(path)) {
      this.navigate('/guest');
      return;
    }
    if (Auth.isLoggedIn() && (path === '/login' || path === '/register' || path === '/guest')) {
      this.navigate('/dashboard');
      return;
    }

    this.currentRoute = path;

    // Find handler
    let handler = this.routes[path];
    if (!handler) {
      // Try pattern match like /practices/123
      for (const [route, h] of Object.entries(this.routes)) {
        const routeParts = route.split('/');
        const pathParts = path.split('/');
        if (routeParts.length === pathParts.length) {
          let match = true;
          const routeParams = {};
          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              routeParams[routeParts[i].slice(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            handler = h;
            Object.assign(params, routeParams);
            break;
          }
        }
      }
    }

    if (handler) {
      // Show loading
      const content = document.getElementById('contentArea');
      content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Загрузка...</p></div>';

      // Update nav
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === path);
      });

      try {
        await handler(params);
      } catch(err) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>${err.message}</p></div>`;
      }
    } else {
      document.getElementById('contentArea').innerHTML = '<div class="empty-state"><i class="fas fa-question-circle"></i><h3>Страница не найдена</h3></div>';
    }

    // Update sidebar active state
    App.updateNav();
    I18N.setLang(I18N.currentLang);
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }
};
