// Упрощенная база данных на основе файлов JSON
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

class SimpleDB {
  constructor() {
    this.dbPath = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dbPath, 'users.json');
    this.sessionsFile = path.join(this.dbPath, 'sessions.json');
    this.logsFile = path.join(this.dbPath, 'logs.json');
    this.settingsFile = path.join(this.dbPath, 'settings.json');
    
    this.init();
  }

  init() {
    // Создаем папку для данных если её нет
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    
    // Инициализируем файлы если их нет
    this.initFile(this.usersFile, []);
    this.initFile(this.sessionsFile, []);
    this.initFile(this.logsFile, []);
    this.initFile(this.settingsFile, []);
    
    console.log('✅ Упрощенная база данных инициализирована');
    
    // Создаем администратора по умолчанию
    this.createDefaultAdmin();
  }

  initFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
  }

  readFile(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Ошибка чтения файла ${filePath}:`, error);
      return [];
    }
  }

  writeFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Ошибка записи файла ${filePath}:`, error);
      return false;
    }
  }

  async createDefaultAdmin() {
    const users = this.readFile(this.usersFile);
    const adminExists = users.some(user => user.username === 'admin');
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      const adminUser = {
        id: 1,
        username: 'admin',
        email: 'admin@atlas.local',
        password_hash: hashedPassword,
        role: 'admin',
        created_at: new Date().toISOString(),
        last_login: null,
        is_active: true
      };
      
      users.push(adminUser);
      this.writeFile(this.usersFile, users);
      
      // Создаем настройки для администратора
      const settings = this.readFile(this.settingsFile);
      settings.push({
        user_id: 1,
        theme: 'dark',
        language: 'ru',
        notifications_enabled: true,
        email_notifications: false,
        telegram_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      this.writeFile(this.settingsFile, settings);
      
      console.log('✅ Администратор по умолчанию создан');
      console.log('👤 Логин: admin');
      console.log('🔑 Пароль: Admin123!');
      console.log('⚠️ Смените пароль после первого входа!');
    }
  }

  // Методы для работы с пользователями
  async createUser(userData) {
    const users = this.readFile(this.usersFile);
    
    // Генерируем ID
    const maxId = users.reduce((max, user) => Math.max(max, user.id || 0), 0);
    const newId = maxId + 1;
    
    const newUser = {
      id: newId,
      ...userData,
      created_at: new Date().toISOString(),
      last_login: null,
      is_active: true
    };
    
    users.push(newUser);
    this.writeFile(this.usersFile, users);
    
    // Создаем настройки по умолчанию
    const settings = this.readFile(this.settingsFile);
    settings.push({
      user_id: newId,
      theme: 'dark',
      language: 'ru',
      notifications_enabled: true,
      email_notifications: false,
      telegram_notifications: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    this.writeFile(this.settingsFile, settings);
    
    return newId;
  }

  getUserByUsername(username) {
    const users = this.readFile(this.usersFile);
    return users.find(user => user.username === username);
  }

  getUserByEmail(email) {
    const users = this.readFile(this.usersFile);
    return users.find(user => user.email === email);
  }

  getUserById(id) {
    const users = this.readFile(this.usersFile);
    return users.find(user => user.id === id);
  }

  getAllUsers() {
    return this.readFile(this.usersFile);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Методы для работы с сессиями
  createSession(sessionData) {
    const sessions = this.readFile(this.sessionsFile);
    
    // Генерируем ID
    const maxId = sessions.reduce((max, session) => Math.max(max, session.id || 0), 0);
    const newId = maxId + 1;
    
    const newSession = {
      id: newId,
      ...sessionData,
      created_at: new Date().toISOString()
    };
    
    sessions.push(newSession);
    this.writeFile(this.sessionsFile, sessions);
    
    return newId;
  }

  getSessionByToken(token) {
    const sessions = this.readFile(this.sessionsFile);
    const session = sessions.find(s => s.session_token === token);
    
    if (!session) return null;
    
    // Проверяем срок действия
    if (new Date(session.expires_at) < new Date()) {
      this.deleteSession(token);
      return null;
    }
    
    // Получаем данные пользователя
    const user = this.getUserById(session.user_id);
    if (!user || !user.is_active) return null;
    
    return {
      ...session,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };
  }

  deleteSession(token) {
    const sessions = this.readFile(this.sessionsFile);
    const filteredSessions = sessions.filter(s => s.session_token !== token);
    this.writeFile(this.sessionsFile, filteredSessions);
    return sessions.length !== filteredSessions.length;
  }

  deleteExpiredSessions() {
    const sessions = this.readFile(this.sessionsFile);
    const now = new Date();
    const activeSessions = sessions.filter(s => new Date(s.expires_at) > now);
    
    const deletedCount = sessions.length - activeSessions.length;
    this.writeFile(this.sessionsFile, activeSessions);
    
    return deletedCount;
  }

  // Методы для логов
  logActivity(logData) {
    const logs = this.readFile(this.logsFile);
    
    // Генерируем ID
    const maxId = logs.reduce((max, log) => Math.max(max, log.id || 0), 0);
    const newId = maxId + 1;
    
    const newLog = {
      id: newId,
      ...logData,
      created_at: new Date().toISOString()
    };
    
    logs.push(newLog);
    this.writeFile(this.logsFile, logs);
    
    return newId;
  }

  getActivityLogs(userId, limit = 100) {
    let logs = this.readFile(this.logsFile);
    
    if (userId) {
      logs = logs.filter(log => log.user_id === userId);
    }
    
    // Сортируем по дате (новые сначала) и ограничиваем
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    logs = logs.slice(0, limit);
    
    // Добавляем имя пользователя
    const users = this.readFile(this.usersFile);
    return logs.map(log => {
      const user = users.find(u => u.id === log.user_id);
      return {
        ...log,
        username: user ? user.username : null
      };
    });
  }

  // Методы для настроек пользователей
  getUserSettings(userId) {
    const settings = this.readFile(this.settingsFile);
    return settings.find(s => s.user_id === userId);
  }

  updateUserSettings(userId, newSettings) {
    const settings = this.readFile(this.settingsFile);
    const index = settings.findIndex(s => s.user_id === userId);
    
    if (index === -1) return false;
    
    settings[index] = {
      ...settings[index],
      ...newSettings,
      updated_at: new Date().toISOString()
    };
    
    return this.writeFile(this.settingsFile, settings);
  }

  // Вспомогательные методы
  updateLastLogin(userId) {
    const users = this.readFile(this.usersFile);
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) return false;
    
    users[index].last_login = new Date().toISOString();
    return this.writeFile(this.usersFile, users);
  }

  updateUserEmail(userId, email) {
    const users = this.readFile(this.usersFile);
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) return false;
    
    users[index].email = email;
    return this.writeFile(this.usersFile, users);
  }

  updateUserPassword(userId, passwordHash) {
    const users = this.readFile(this.usersFile);
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) return false;
    
    users[index].password_hash = passwordHash;
    return this.writeFile(this.usersFile, users);
  }

  updateUserRole(userId, role) {
    const users = this.readFile(this.usersFile);
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) return false;

    users[index].role = role;
    return this.writeFile(this.usersFile, users);
  }

  updateUserActiveStatus(userId, isActive) {
    const users = this.readFile(this.usersFile);
    const index = users.findIndex(u => u.id === userId);

    if (index === -1) return false;

    users[index].is_active = isActive;
    return this.writeFile(this.usersFile, users);
  }

  // Получение статистики
  getStats() {
    const users = this.readFile(this.usersFile);
    const sessions = this.readFile(this.sessionsFile);
    const logs = this.readFile(this.logsFile);
    
    return {
      users: users.length,
      active_users: users.filter(u => u.is_active).length,
      admins: users.filter(u => u.role === 'admin').length,
      active_sessions: sessions.filter(s => new Date(s.expires_at) > new Date()).length,
      total_logs: logs.length,
      last_24h_logs: logs.filter(log => {
        const logDate = new Date(log.created_at);
        const now = new Date();
        return (now - logDate) < 24 * 60 * 60 * 1000;
      }).length
    };
  }
}

// Экспортируем синглтон
const db = new SimpleDB();
module.exports = db;