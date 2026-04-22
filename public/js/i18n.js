// i18n.js — Internationalization Module (Русский / Казахский)
const I18N = {
  currentLang: localStorage.getItem('practday_lang') || 'ru',

  translations: {
    ru: {
      // General
      loading: 'Загрузка...',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      create: 'Создать',
      search: 'Поиск...',
      filter: 'Фильтр',
      export_pdf: 'Экспорт PDF',
      export_excel: 'Экспорт Excel',
      all: 'Все',
      actions: 'Действия',
      confirm: 'Подтвердить',
      reject: 'Отклонить',
      approve: 'Утвердить',
      back: 'Назад',
      close: 'Закрыть',
      yes: 'Да',
      no: 'Нет',

      // Nav
      nav_dashboard: 'Главная',
      nav_practices: 'Места практики',
      nav_diary: 'Дневник',
      nav_attendance: 'Посещаемость',
      nav_reviews: 'Отзывы',
      nav_characteristics: 'Характеристики',
      nav_reports: 'Отчёты',
      nav_users: 'Пользователи',
      nav_chat: 'Сообщения',
      nav_section_main: 'ОСНОВНЫЕ',
      nav_section_ai: 'ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ',
      nav_section_admin: 'АДМИНИСТРИРОВАНИЕ',

      // Auth
      login: 'Войти',
      register: 'Регистрация',
      email: 'Email',
      password: 'Пароль',
      full_name: 'ФИО',
      phone: 'Телефон',
      role: 'Роль',
      role_student: 'Студент',
      role_partner: 'Социальный партнёр',
      role_admin: 'Администратор',
      role_guest: 'Гость',
      group: 'Группа',
      specialty: 'Специальность',
      organization: 'Организация',
      forgot_password: 'Забыли пароль?',
      logout: 'Выйти',

      // Dashboard
      welcome: 'Добро пожаловать',
      total_students: 'Всего студентов',
      active_practices: 'Активных практик',
      applications: 'Заявки',
      completion_rate: 'Завершено',

      // Practices
      practice_catalog: 'Каталог мест практики',
      discipline: 'Дисциплина',
      format: 'Формат',
      format_onsite: 'Очно',
      format_remote: 'Заочно',
      format_hybrid: 'Гибридное',
      city: 'Город',
      start_date: 'Дата начала',
      end_date: 'Дата окончания',
      max_students: 'Макс. студентов',
      apply: 'Подать заявку',
      applied: 'Заявка подана',
      add_practice: 'Добавить практику',
      add_partner: 'Добавить партнёра',

      // Attendance
      check_in: 'Отметить вход',
      check_out: 'Отметить выход',
      present: 'Присутствие',
      absent: 'Отсутствие',
      location_valid: 'Геолокация подтверждена',
      location_invalid: 'Вне зоны практики',

      // Diary
      diary_title: 'Электронный дневник практики',
      add_entry: 'Добавить запись',
      entry_date: 'Дата',
      work_description: 'Описание работ',
      skills: 'Навыки',
      hours: 'Часы',
      remarks: 'Замечания',
      completeness: 'Полнота заполнения',

      // Reviews
      review_text: 'Текст отзыва',
      add_review: 'Оставить отзыв',
      sentiment: 'Тональность',
      positive: 'Позитивный',
      negative: 'Негативный',
      neutral: 'Нейтральный',

      // Characteristics
      generate: 'Сгенерировать',
      characteristic: 'Характеристика',
      generated_by_ai: 'Сгенерировано ИИ',

      // Reports
      reports_title: 'Отчёты и аналитика',
      attendance_report: 'Отчёт по посещаемости',
      progress_report: 'Отчёт по прогрессу',
      statistics: 'Общая статистика',

      // Notifications
      notifications: 'Уведомления',
      read_all: 'Прочитать все',
      no_notifications: 'Нет уведомлений',

      // Status
      status_pending: 'Ожидает',
      status_approved: 'Одобрено',
      status_rejected: 'Отклонено',
      status_draft: 'Черновик',
      status_submitted: 'Отправлено',
      status_confirmed: 'Подтверждено',
      status_generated: 'Сгенерировано',
      status_edited: 'Отредактировано',
    },

    kk: {
      // General
      loading: 'Жүктелуде...',
      save: 'Сақтау',
      cancel: 'Болдырмау',
      delete: 'Жою',
      edit: 'Өңдеу',
      create: 'Құру',
      search: 'Іздеу...',
      filter: 'Сүзгі',
      export_pdf: 'PDF экспорт',
      export_excel: 'Excel экспорт',
      all: 'Барлығы',
      actions: 'Әрекеттер',
      confirm: 'Растау',
      reject: 'Қабылдамау',
      approve: 'Бекіту',
      back: 'Артқа',
      close: 'Жабу',
      yes: 'Иә',
      no: 'Жоқ',

      // Nav
      nav_dashboard: 'Басты бет',
      nav_practices: 'Тәжірибе орындары',
      nav_diary: 'Күнделік',
      nav_attendance: 'Қатысу',
      nav_reviews: 'Пікірлер',
      nav_characteristics: 'Мінездемелер',
      nav_reports: 'Есептер',
      nav_users: 'Пайдаланушылар',
      nav_chat: 'Хабарламалар',
      nav_section_main: 'НЕГІЗГІ',
      nav_section_ai: 'ЖАСАНДЫ ИНТЕЛЛЕКТ',
      nav_section_admin: 'ӘКІМШІЛІК',

      // Auth
      login: 'Кіру',
      register: 'Тіркелу',
      email: 'Email',
      password: 'Құпиясөз',
      full_name: 'Толық аты-жөні',
      phone: 'Телефон',
      role: 'Рөл',
      role_student: 'Студент',
      role_partner: 'Əлеуметтік серіктес',
      role_admin: 'Әкімші',
      role_guest: 'Қонақ',
      group: 'Топ',
      specialty: 'Мамандық',
      organization: 'Ұйым',
      forgot_password: 'Құпиясөзді ұмыттыңыз ба?',
      logout: 'Шығу',

      // Dashboard
      welcome: 'Қош келдіңіз',
      total_students: 'Барлық студенттер',
      active_practices: 'Белсенді тәжірибелер',
      applications: 'Өтінімдер',
      completion_rate: 'Аяқталған',

      // Practices
      practice_catalog: 'Тәжірибе орындарының каталогы',
      discipline: 'Пән',
      format: 'Формат',
      format_onsite: 'Күндізгі',
      format_remote: 'Сырттай',
      format_hybrid: 'Аралас',
      city: 'Қала',
      start_date: 'Бастау күні',
      end_date: 'Аяқтау күні',
      max_students: 'Макс. студенттер',
      apply: 'Өтінім беру',
      applied: 'Өтінім берілді',
      add_practice: 'Тәжірибе қосу',
      add_partner: 'Серіктес қосу',

      // Attendance
      check_in: 'Кіруді белгілеу',
      check_out: 'Шығуды белгілеу',
      present: 'Қатысу',
      absent: 'Қатыспау',
      location_valid: 'Геолокация расталды',
      location_invalid: 'Тәжірибе аймағынан тыс',

      // Diary
      diary_title: 'Тәжірибенің электрондық күнделігі',
      add_entry: 'Жазба қосу',
      entry_date: 'Күні',
      work_description: 'Жұмыс сипаттамасы',
      skills: 'Дағдылар',
      hours: 'Сағаттар',
      remarks: 'Ескертулер',
      completeness: 'Толтыру толықтығы',

      // Reviews
      review_text: 'Пікір мәтіні',
      add_review: 'Пікір қалдыру',
      sentiment: 'Тональділік',
      positive: 'Оң',
      negative: 'Теріс',
      neutral: 'Бейтарап',

      // Characteristics
      generate: 'Құрастыру',
      characteristic: 'Мінездеме',
      generated_by_ai: 'ЖИ арқылы құрастырылған',

      // Reports
      reports_title: 'Есептер мен аналитика',
      attendance_report: 'Қатысу есебі',
      progress_report: 'Үлгерім есебі',
      statistics: 'Жалпы статистика',

      // Notifications
      notifications: 'Хабарландырулар',
      read_all: 'Барлығын оқу',
      no_notifications: 'Хабарландырулар жоқ',

      // Status
      status_pending: 'Күтуде',
      status_approved: 'Мақұлданды',
      status_rejected: 'Қабылданбады',
      status_draft: 'Жоба',
      status_submitted: 'Жіберілді',
      status_confirmed: 'Расталды',
      status_generated: 'Құрастырылды',
      status_edited: 'Өңделді',
    }
  },

  t(key) {
    return this.translations[this.currentLang]?.[key] || this.translations['ru']?.[key] || key;
  },

  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('practday_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    });
    // Update lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
};
