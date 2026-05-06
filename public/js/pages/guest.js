// pages/guest.js — Landing page for unauthorized users
Router.register('/guest', async () => {
  const content = document.getElementById('contentArea');
  const sidebar = document.getElementById('sidebar');
  const topBar = document.querySelector('.top-bar');
  const mainContent = document.querySelector('.main-content');
  
  // Hide sidebar and topbar for guest landing
  sidebar.style.display = 'none';
  topBar.style.display = 'none';
  mainContent.style.marginLeft = '0';

  try {
    const data = await API.get('/practices');
    const practices = data.practices || [];

    content.innerHTML = `
      <div class="guest-page">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-content">
            <div class="hero-badge"><i class="fas fa-sparkles"></i> <span>Powered by AI</span></div>
            <h1 class="hero-title">PractDay <em class="ai-text">AI</em></h1>
            <p class="hero-subtitle">Инновационная система управления учебно-производственной практикой для колледжей Павлодарской области.</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="Router.navigate('/login')"><i class="fas fa-sign-in-alt"></i> Войти в систему</button>
              <button class="btn btn-secondary btn-lg" onclick="document.getElementById('catalog').scrollIntoView({behavior:'smooth'})"><i class="fas fa-search"></i> Каталог практик</button>
            </div>
          </div>
          <div class="hero-features">
            <div class="feat-mini-card">
              <i class="fas fa-robot"></i>
              <span>AI Характеристики</span>
            </div>
            <div class="feat-mini-card">
              <i class="fas fa-map-marker-alt"></i>
              <span>GPS Контроль</span>
            </div>
            <div class="feat-mini-card">
              <i class="fas fa-book"></i>
              <span>Электронный дневник</span>
            </div>
          </div>
        </section>

        <!-- Stats Section -->
        <section class="stats-section">
          <div class="container">
            <div class="stats-grid-guest">
              <div class="stat-item">
                <span class="stat-num">50+</span>
                <span class="stat-text">Предприятий-партнёров</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">1000+</span>
                <span class="stat-text">Студентов ежегодно</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">100%</span>
                <span class="stat-text">Цифровой контроль</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Practices Catalog -->
        <section class="catalog-section" id="catalog">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">Каталог мест практики</h2>
              <p class="section-subtitle">Ознакомьтесь с доступными предложениями от наших социальных партнёров.</p>
            </div>

            <div class="practices-grid">
              ${practices.map(p => `
                <div class="practice-card">
                  <div class="p-card-header">
                    <span class="p-format tag-${p.format}">${p.format === 'onsite' ? 'Очно' : p.format === 'remote' ? 'Заочно' : 'Гибрид'}</span>
                    <span class="p-city"><i class="fas fa-map-marker-alt"></i> ${p.city || 'Павлодар'}</span>
                  </div>
                  <h3 class="p-title">${p.title}</h3>
                  <p class="p-partner">${p.partner_name || 'Организация уточняется'}</p>
                  <div class="p-details">
                    <div class="p-detail"><i class="fas fa-graduation-cap"></i> ${p.discipline}</div>
                    <div class="p-detail"><i class="fas fa-users"></i> Мест: ${p.max_students}</div>
                  </div>
                  <button class="btn btn-primary-outline" style="width:100%;margin-top:16px;" onclick="Router.navigate('/login')">
                    Авторизоваться для подачи
                  </button>
                </div>
              `).join('')}
              ${practices.length === 0 ? '<div class="empty-state">Нет доступных практик на данный момент</div>' : ''}
            </div>
          </div>
        </section>

        <!-- Benefits Section -->
        <section class="benefits-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">Почему PractDay AI?</h2>
            </div>
            <div class="benefits-grid">
              <div class="benefit-card">
                <div class="b-icon"><i class="fas fa-bolt"></i></div>
                <h3>Автоматизация</h3>
                <p>Забудьте о бумажных дневниках. Всё заполнение и подтверждение происходит в один клик.</p>
              </div>
              <div class="benefit-card">
                <div class="b-icon"><i class="fas fa-shield-alt"></i></div>
                <h3>Прозрачность</h3>
                <p>Геолокация подтверждает физическое присутствие студента на рабочем месте.</p>
              </div>
              <div class="benefit-card">
                <div class="b-icon"><i class="fas fa-brain"></i></div>
                <h3>Искусственный интеллект</h3>
                <p>NLP-модули анализируют отзывы партнёров и автоматически формируют характеристики.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="guest-footer">
          <div class="container">
            <div class="footer-content">
              <div class="footer-logo">
                <i class="fas fa-graduation-cap"></i>
                <span>PractDay <em>AI</em></span>
              </div>
              <p>&copy; 2024 PractDay AI. Павлодарская область, Республика Казахстан.</p>
            </div>
          </div>
        </footer>
      </div>
    `;

    // Inject guest-specific styles if not present
    if (!document.getElementById('guest-styles')) {
      const style = document.createElement('style');
      style.id = 'guest-styles';
      style.textContent = `
        .guest-page {
          background: var(--bg-primary);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--text-primary);
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .hero-section {
          padding: 100px 20px 60px;
          text-align: center;
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent),
                      radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent);
          position: relative;
          overflow: hidden;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 20px;
          letter-spacing: -1px;
        }
        .ai-text {
          font-style: normal;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 40px;
          line-height: 1.6;
        }
        .hero-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .hero-features {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 60px;
        }
        .feat-mini-card {
          background: var(--card-bg);
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
          font-weight: 500;
        }
        .feat-mini-card i {
          color: var(--primary);
        }
        .stats-section {
          padding: 60px 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          background: var(--card-bg);
        }
        .stats-grid-guest {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          text-align: center;
        }
        .stat-num {
          display: block;
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 8px;
        }
        .stat-text {
          color: var(--text-secondary);
          font-weight: 500;
        }
        .catalog-section {
          padding: 100px 0;
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-title {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .section-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }
        .practices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .practice-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        .practice-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-light);
        }
        .p-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .p-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .p-partner {
          color: var(--text-secondary);
          margin-bottom: 20px;
          font-weight: 500;
        }
        .p-details {
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .p-detail {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .p-detail i {
          width: 16px;
          color: var(--primary);
        }
        .benefits-section {
          padding: 100px 0;
          background: var(--card-bg);
        }
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }
        .benefit-card {
          padding: 40px;
          background: var(--bg-primary);
          border-radius: 24px;
          border: 1px solid var(--border-color);
          text-align: center;
        }
        .b-icon {
          width: 64px;
          height: 64px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 24px;
        }
        .benefit-card h3 {
          margin-bottom: 16px;
          font-size: 1.25rem;
        }
        .benefit-card p {
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .guest-footer {
          padding: 60px 0;
          border-top: 1px solid var(--border-color);
          text-align: center;
        }
        .footer-logo {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .footer-logo i { color: var(--primary); }
        .footer-content p { color: var(--text-secondary); font-size: 0.9rem; }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .stats-grid-guest, .benefits-grid { grid-template-columns: 1fr; }
          .hero-features { flex-direction: column; align-items: center; }
        }
      `;
      document.head.appendChild(style);
    }

  } catch (err) {
    content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка загрузки</h3><p>${err.message}</p></div>`;
  }
});
