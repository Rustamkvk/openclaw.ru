// Модуль авторизации для Контрольного центра Атласа
class AuthManager {
  constructor() {
    this.apiUrl = `${window.location.origin}/api`;
    this.tokenKey = 'atlas_auth_token';
    this.userKey = 'atlas_user_data';
    this.isAuthenticated = false;
    this.currentUser = null;
    
    // DOM элементы
    this.authButtons = document.getElementById('auth-buttons');
    this.userInfo = document.getElementById('user-info');
    this.userName = document.getElementById('user-name');
    this.userRole = document.getElementById('user-role');
    this.loginBtn = document.getElementById('login-btn');
    this.registerBtn = document.getElementById('register-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    
    this.init();
  }

  init() {
    // Проверяем сохраненный токен при загрузке
    this.checkAuth();
    
    // Настраиваем обработчики событий
    this.setupEventListeners();
    
    // Настраиваем модальные окна
    this.setupModals();
  }

  setupEventListeners() {
    // Кнопки входа/регистрации
    if (this.loginBtn) {
      this.loginBtn.addEventListener('click', () => this.showLoginModal());
    }
    
    if (this.registerBtn) {
      this.registerBtn.addEventListener('click', () => this.showRegisterModal());
    }
    
    // Кнопка выхода
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  setupModals() {
    // Модальные окна
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    
    // Кнопки закрытия
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        this.hideModal(modalId);
      });
    });
    
    // Переключение между модальными окнами
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    if (showRegister) {
      showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideModal('login-modal');
        this.showModal('register-modal');
      });
    }
    
    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideModal('register-modal');
        this.showModal('login-modal');
      });
    }
    
    // Форма входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }
    
    // Закрытие модальных окон по клику вне контента
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal(modal.id);
        }
      });
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal('login-modal');
        this.hideModal('register-modal');
      }
    });
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Фокус на первое поле ввода
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      
      // Очистка форм
      const form = modal.querySelector('form');
      if (form) {
        form.reset();
        this.clearFormErrors(form);
      }
    }
  }

  clearFormErrors(form) {
    const alerts = form.querySelectorAll('.alert');
    alerts.forEach(alert => {
      alert.style.display = 'none';
    });
    
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      input.style.borderColor = '';
    });
  }

  showAlert(form, message, type = 'error') {
    // Удаляем старые алерты
    const oldAlerts = form.querySelectorAll('.alert');
    oldAlerts.forEach(alert => alert.remove());
    
    // Создаем новый алерт
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    
    // Вставляем перед формой
    form.insertBefore(alertDiv, form.firstChild);
    
    // Автоудаление через 5 секунд для успешных сообщений
    if (type === 'success') {
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 5000);
    }
  }

  async handleLogin() {
    const form = document.getElementById('login-form');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
      this.showAlert(form, 'Заполните все поля', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Сохраняем токен и данные пользователя
        this.saveAuthData(data.token, data.user);
        
        // Обновляем интерфейс
        this.updateUI();
        
        // Показываем сообщение об успехе
        this.showAlert(form, 'Вход выполнен успешно!', 'success');
        
        // Закрываем модальное окно через 1 секунду
        setTimeout(() => {
          this.hideModal('login-modal');
        }, 1000);
        
        // Отправляем системное уведомление
        this.showNotification(`Добро пожаловать, ${data.user.username}!`, 'success');
        
      } else {
        this.showAlert(form, data.error || 'Ошибка входа', 'error');
      }
      
    } catch (error) {
      console.error('Ошибка входа:', error);
      this.showAlert(form, 'Ошибка соединения с сервером', 'error');
    }
  }

  async handleRegister() {
    const form = document.getElementById('register-form');
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    // Валидация
    if (!username || !email || !password || !confirmPassword) {
      this.showAlert(form, 'Заполните все поля', 'error');
      return;
    }
    
    if (password.length < 6) {
      this.showAlert(form, 'Пароль должен быть не менее 6 символов', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      this.showAlert(form, 'Пароли не совпадают', 'error');
      return;
    }
    
    // Проверка имени пользователя (только латинские буквы, цифры, подчеркивания)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      this.showAlert(form, 'Имя пользователя может содержать только латинские буквы, цифры и подчеркивания', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Показываем сообщение об успехе
        this.showAlert(form, 'Регистрация успешна! Теперь вы можете войти.', 'success');
        
        // Переключаемся на форму входа через 2 секунды
        setTimeout(() => {
          this.hideModal('register-modal');
          this.showModal('login-modal');
        }, 2000);
        
      } else {
        this.showAlert(form, data.error || 'Ошибка регистрации', 'error');
      }
      
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      this.showAlert(form, 'Ошибка соединения с сервером', 'error');
    }
  }

  async checkAuth() {
    const token = this.getToken();
    
    if (!token) {
      this.isAuthenticated = false;
      this.currentUser = null;
      this.updateUI();
      return;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = true;
        this.currentUser = data.user;
        this.saveUserData(data.user);
        this.updateUI();
      } else {
        // Токен недействителен, очищаем данные
        this.clearAuthData();
      }
      
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      this.clearAuthData();
    }
  }

  async logout() {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(`${this.apiUrl}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Ошибка выхода:', error);
      }
    }
    
    // Очищаем данные независимо от результата запроса
    this.clearAuthData();
    this.updateUI();
    
    // Показываем уведомление
    this.showNotification('Вы успешно вышли из системы', 'success');
  }

  // Работа с локальным хранилищем
  saveAuthData(token, user) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.isAuthenticated = true;
    this.currentUser = user;
  }

  saveUserData(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser = user;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  clearAuthData() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  // Обновление интерфейса
  updateUI() {
    if (this.isAuthenticated && this.currentUser) {
      // Показываем информацию о пользователе
      if (this.authButtons) this.authButtons.style.display = 'none';
      if (this.userInfo) this.userInfo.style.display = 'flex';
      
      // Обновляем данные пользователя
      if (this.userName) {
        this.userName.textContent = this.currentUser.username;
      }
      
      if (this.userRole) {
        const roleMap = {
          'admin': 'Администратор',
          'user': 'Пользователь'
        };
        this.userRole.textContent = roleMap[this.currentUser.role] || this.currentUser.role;
      }
      
      // Обновляем доступ к функциям в зависимости от роли
      this.updatePermissions();
      this.renderAccountSections();
      
    } else {
      // Показываем кнопки авторизации
      if (this.authButtons) this.authButtons.style.display = 'flex';
      if (this.userInfo) this.userInfo.style.display = 'none';
      
      // Сбрасываем доступ к функциям
      this.resetPermissions();
      this.renderPublicSections();
    }
  }

  renderPublicSections() {
    const settingsRoot = document.getElementById('settings-content');
    const logsRoot = document.getElementById('logs-content');
    const healthRoot = document.getElementById('health-content');

    if (settingsRoot) {
      settingsRoot.innerHTML = '<p>Войдите в систему, чтобы изменить профиль и настройки уведомлений.</p>';
    }
    if (logsRoot) {
      logsRoot.innerHTML = '<p>Логи доступны только авторизованным пользователям.</p>';
    }
    if (healthRoot) {
      healthRoot.innerHTML = '<p>Проверка системы доступна после входа.</p>';
    }
  }

  async renderAccountSections() {
    this.renderProfileSection();
    await this.renderLogsSection();
    await this.renderHealthSection();
    if (this.currentUser?.role === 'admin') {
      await this.renderAdminSection();
    } else {
      const adminRoot = document.getElementById('admin-users-content');
      if (adminRoot) {
        adminRoot.innerHTML = '<p>Раздел администрирования доступен только администраторам.</p>';
      }
    }
  }

  renderProfileSection() {
    const settingsRoot = document.getElementById('settings-content');
    if (!settingsRoot || !this.currentUser) return;

    settingsRoot.innerHTML = `
      <h3 style="margin-bottom: 16px;">Профиль пользователя</h3>
      <form id="profile-form" style="display:grid; gap:12px; max-width:540px;">
        <label>Имя пользователя</label>
        <input type="text" value="${this.currentUser.username}" disabled />
        <label>Email</label>
        <input type="email" id="profile-email" value="${this.currentUser.email || ''}" required />
        <label>Текущий пароль</label>
        <input type="password" id="profile-current-password" placeholder="Для смены пароля" />
        <label>Новый пароль</label>
        <input type="password" id="profile-new-password" placeholder="Оставьте пустым, если не меняете" />
        <button type="submit" class="btn btn-primary">Сохранить профиль</button>
      </form>
    `;

    const form = document.getElementById('profile-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('profile-email')?.value?.trim();
      const currentPassword = document.getElementById('profile-current-password')?.value;
      const newPassword = document.getElementById('profile-new-password')?.value;

      const payload = { email };
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const response = await this.authorizedFetch(`${this.apiUrl}/profile`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        this.showNotification(data.error || 'Ошибка сохранения профиля', 'error');
        return;
      }
      this.currentUser.email = email;
      this.saveUserData(this.currentUser);
      this.showNotification('Профиль обновлен', 'success');
    });
  }

  async renderLogsSection() {
    const logsRoot = document.getElementById('logs-content');
    if (!logsRoot) return;

    const endpoint = this.currentUser?.role === 'admin' ? `${this.apiUrl}/activity-logs?limit=20` : `${this.apiUrl}/activity-logs?limit=10&userId=${this.currentUser.id}`;
    const response = await this.authorizedFetch(endpoint, { method: 'GET' });
    const data = await response.json();
    if (!response.ok) {
      logsRoot.innerHTML = `<p>Ошибка загрузки логов: ${data.error || 'неизвестно'}</p>`;
      return;
    }

    const rows = (data.logs || []).map((log) => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString('ru-RU')}</td>
        <td>${log.username || 'system'}</td>
        <td>${log.action}</td>
        <td>${log.details || ''}</td>
      </tr>
    `).join('');

    logsRoot.innerHTML = `
      <h3 style="margin-bottom: 16px;">Логи активности</h3>
      <div style="overflow:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Детали</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  async renderHealthSection() {
    const healthRoot = document.getElementById('health-content');
    if (!healthRoot) return;

    const response = await fetch(`${this.apiUrl}/health`);
    const data = await response.json();
    healthRoot.innerHTML = `
      <h3 style="margin-bottom: 16px;">Состояние сервисов</h3>
      <p>API: <strong>${data.status === 'ok' ? 'доступен' : 'ошибка'}</strong></p>
      <p>Время сервера: ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
    `;
  }

  async renderAdminSection() {
    const adminRoot = document.getElementById('admin-users-content');
    if (!adminRoot) return;

    const response = await this.authorizedFetch(`${this.apiUrl}/users`, { method: 'GET' });
    const data = await response.json();
    if (!response.ok) {
      adminRoot.innerHTML = `<p>Ошибка загрузки пользователей: ${data.error || 'неизвестно'}</p>`;
      return;
    }

    const userRows = (data.users || []).map((user) => `
      <tr>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>
          <select data-role-user-id="${user.id}">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </td>
        <td>
          <select data-status-user-id="${user.id}">
            <option value="true" ${user.is_active ? 'selected' : ''}>active</option>
            <option value="false" ${!user.is_active ? 'selected' : ''}>disabled</option>
          </select>
        </td>
      </tr>
    `).join('');

    adminRoot.innerHTML = `
      <h3 style="margin-bottom:16px;">Управление пользователями</h3>
      <div style="overflow:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr><th>Логин</th><th>Email</th><th>Роль</th><th>Статус</th></tr>
          </thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    `;

    adminRoot.querySelectorAll('select[data-role-user-id]').forEach((element) => {
      element.addEventListener('change', async (event) => {
        const userId = event.target.getAttribute('data-role-user-id');
        const role = event.target.value;
        const roleResp = await this.authorizedFetch(`${this.apiUrl}/users/${userId}/role`, {
          method: 'PUT',
          body: JSON.stringify({ role })
        });
        const roleData = await roleResp.json();
        this.showNotification(roleResp.ok ? 'Роль обновлена' : (roleData.error || 'Ошибка обновления роли'), roleResp.ok ? 'success' : 'error');
      });
    });

    adminRoot.querySelectorAll('select[data-status-user-id]').forEach((element) => {
      element.addEventListener('change', async (event) => {
        const userId = event.target.getAttribute('data-status-user-id');
        const is_active = event.target.value === 'true';
        const statusResp = await this.authorizedFetch(`${this.apiUrl}/users/${userId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ is_active })
        });
        const statusData = await statusResp.json();
        this.showNotification(statusResp.ok ? 'Статус обновлен' : (statusData.error || 'Ошибка обновления статуса'), statusResp.ok ? 'success' : 'error');
      });
    });
  }

  updatePermissions() {
    // Здесь можно добавить логику для ограничения доступа
    // в зависимости от роли пользователя
    
    const isAdmin = this.currentUser?.role === 'admin';
    
    // Пример: скрыть/показать административные разделы
    const adminLinks = document.querySelectorAll('[data-admin-only]');
    adminLinks.forEach(link => {
      link.style.display = isAdmin ? 'flex' : 'none';
    });
    
    // Пример: отключить кнопки для неавторизованных пользователей
    const protectedButtons = document.querySelectorAll('[data-protected]');
    protectedButtons.forEach(button => {
      button.disabled = !this.isAuthenticated;
    });
  }

  resetPermissions() {
    // Сбрасываем все ограничения
    const adminLinks = document.querySelectorAll('[data-admin-only]');
    adminLinks.forEach(link => {
      link.style.display = 'none';
    });
    
    const protectedButtons = document.querySelectorAll('[data-protected]');
    protectedButtons.forEach(button => {
      button.disabled = true;
    });
  }

  // Вспомогательные методы
  showNotification(message, type = 'info') {
    // Используем существующую систему уведомлений
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  showLoginModal() {
    this.showModal('login-modal');
  }

  showRegisterModal() {
    this.showModal('register-modal');
  }

  // Метод для получения заголовков авторизации
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Метод для выполнения авторизованных запросов
  async authorizedFetch(url, options = {}) {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
      'Content-Type': 'application/json'
    };
    
    return fetch(url, {
      ...options,
      headers
    });
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}