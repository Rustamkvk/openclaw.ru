const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./simple-db');

class SimpleAuthServer {
  constructor() {
    this.app = express();
    this.port = 3001;
    this.jwtSecret = process.env.JWT_SECRET || 'atlas-dashboard-secret-key-change-in-production';
    this.tokenExpiry = '7d'; // 7 дней
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS для фронтенда
    this.app.use(cors({
      origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'],
      credentials: true
    }));
    
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Логирование запросов
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });
  }

  sanitizeUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      last_login: user.last_login,
      is_active: user.is_active
    };
  }

  setupRoutes() {
    // Проверка здоровья
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        db: 'simple-json',
        version: '1.0.0'
      });
    });

    // Статистика системы
    this.app.get('/api/stats', this.authenticateToken, this.authorizeAdmin, (req, res) => {
      try {
        const stats = db.getStats();
        res.json({ success: true, stats });
      } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Регистрация
    this.app.post('/api/register', async (req, res) => {
      try {
        const { username, email, password } = req.body;
        
        // Валидация
        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        if (password.length < 6) {
          return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
        }
        
        // Проверка существующего пользователя
        const existingUser = db.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }
        
        const existingEmail = db.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создание пользователя
        const userId = await db.createUser({
          username,
          email,
          password_hash: hashedPassword,
          role: 'user'
        });
        
        // Логирование
        await db.logActivity({
          user_id: userId,
          action: 'REGISTER',
          details: `Новый пользователь: ${username}`,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        res.status(201).json({ 
          success: true, 
          message: 'Пользователь успешно зарегистрирован',
          userId 
        });
        
      } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Вход
    this.app.post('/api/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }
        
        // Поиск пользователя
        const user = db.getUserByUsername(username);
        if (!user) {
          return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }
        
        // Проверка активности
        if (!user.is_active) {
          return res.status(403).json({ error: 'Аккаунт деактивирован' });
        }
        
        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }
        
        // Создание JWT токена
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username,
            role: user.role 
          },
          this.jwtSecret,
          { expiresIn: this.tokenExpiry }
        );
        
        // Создание сессии в базе данных
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней
        
        db.createSession({
          user_id: user.id,
          session_token: token,
          expires_at: expiresAt.toISOString(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        // Обновление времени последнего входа
        db.updateLastLogin(user.id);
        
        // Логирование
        db.logActivity({
          user_id: user.id,
          action: 'LOGIN',
          details: 'Успешный вход в систему',
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          }
        });
        
      } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Выход
    this.app.post('/api/logout', this.authenticateToken, async (req, res) => {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
          db.deleteSession(token);
          
          // Логирование
          db.logActivity({
            user_id: req.user.userId,
            action: 'LOGOUT',
            details: 'Выход из системы',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          });
        }
        
        res.json({ success: true, message: 'Вы успешно вышли из системы' });
        
      } catch (error) {
        console.error('Ошибка выхода:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Проверка токена
    this.app.get('/api/verify', this.authenticateToken, async (req, res) => {
      try {
        const user = db.getUserById(req.user.userId);
        
        if (!user || !user.is_active) {
          return res.status(401).json({ error: 'Пользователь не найден или деактивирован' });
        }
        
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at
          }
        });
        
      } catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Получение профиля
    this.app.get('/api/profile', this.authenticateToken, async (req, res) => {
      try {
        const user = db.getUserById(req.user.userId);
        const settings = db.getUserSettings(req.user.userId);
        
        if (!user) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            last_login: user.last_login,
            is_active: user.is_active
          },
          settings: settings || {}
        });
        
      } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Обновление профиля
    this.app.put('/api/profile', this.authenticateToken, async (req, res) => {
      try {
        const { email, currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        const user = db.getUserById(userId);
        
        // Обновление email
        if (email && email !== user.email) {
          const existingEmail = db.getUserByEmail(email);
          if (existingEmail) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
          }
          
          // Обновляем email в базе
          db.updateUserEmail(userId, email);
          
          // Логирование
          db.logActivity({
            user_id: userId,
            action: 'UPDATE_PROFILE',
            details: `Изменен email с ${user.email} на ${email}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          });
        }
        
        // Смена пароля
        if (currentPassword && newPassword) {
          if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
          }
          
          const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
          if (!isValidPassword) {
            return res.status(401).json({ error: 'Текущий пароль неверен' });
          }
          
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          db.updateUserPassword(userId, hashedPassword);
          
          // Логирование
          db.logActivity({
            user_id: userId,
            action: 'CHANGE_PASSWORD',
            details: 'Пароль изменен',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          });
        }
        
        res.json({ success: true, message: 'Профиль успешно обновлен' });
        
      } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Обновление настроек
    this.app.put('/api/settings', this.authenticateToken, async (req, res) => {
      try {
        const userId = req.user.userId;
        const settings = req.body;
        
        const updated = db.updateUserSettings(userId, settings);
        
        if (updated) {
          // Логирование
          db.logActivity({
            user_id: userId,
            action: 'UPDATE_SETTINGS',
            details: `Обновлены настройки: ${Object.keys(settings).join(', ')}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
          });
          
          res.json({ success: true, message: 'Настройки обновлены' });
        } else {
          res.status(400).json({ error: 'Не удалось обновить настройки' });
        }
        
      } catch (error) {
        console.error('Ошибка обновления настроек:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Получение логов активности (только для админов)
    this.app.get('/api/activity-logs', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const { userId, limit = 100 } = req.query;
        const logs = db.getActivityLogs(userId || null, parseInt(limit));
        
        res.json({ success: true, logs });
        
      } catch (error) {
        console.error('Ошибка получения логов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Очистка старых сессий (крон задача)
    this.app.post('/api/cleanup-sessions', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const deletedCount = db.deleteExpiredSessions();
        res.json({ success: true, deleted: deletedCount });
        
      } catch (error) {
        console.error('Ошибка очистки сессий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Получение списка пользователей (только для админов)
    this.app.get('/api/users', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const safeUsers = db.getAllUsers().map((user) => this.sanitizeUser(user));
        res.json({ success: true, users: safeUsers });
        
      } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Изменение роли пользователя (admin)
    this.app.put('/api/users/:id/role', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const targetUserId = parseInt(req.params.id, 10);
        const { role } = req.body;
        const allowedRoles = ['user', 'admin'];

        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ error: 'Недопустимая роль' });
        }

        const targetUser = db.getUserById(targetUserId);
        if (!targetUser) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const updated = db.updateUserRole(targetUserId, role);
        if (!updated) {
          return res.status(400).json({ error: 'Не удалось обновить роль' });
        }

        db.logActivity({
          user_id: req.user.userId,
          action: 'UPDATE_USER_ROLE',
          details: `Пользователь ${targetUser.username}: роль изменена на ${role}`,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

        return res.json({ success: true, message: 'Роль обновлена' });
      } catch (error) {
        console.error('Ошибка обновления роли:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Изменение активности пользователя (admin)
    this.app.put('/api/users/:id/status', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const targetUserId = parseInt(req.params.id, 10);
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
          return res.status(400).json({ error: 'Параметр is_active должен быть boolean' });
        }

        if (targetUserId === req.user.userId && !is_active) {
          return res.status(400).json({ error: 'Нельзя деактивировать собственный аккаунт' });
        }

        const targetUser = db.getUserById(targetUserId);
        if (!targetUser) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const updated = db.updateUserActiveStatus(targetUserId, is_active);
        if (!updated) {
          return res.status(400).json({ error: 'Не удалось обновить статус' });
        }

        db.logActivity({
          user_id: req.user.userId,
          action: 'UPDATE_USER_STATUS',
          details: `Пользователь ${targetUser.username}: активность ${is_active ? 'включена' : 'отключена'}`,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

        return res.json({ success: true, message: 'Статус пользователя обновлен' });
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });
  }

  // Middleware для аутентификации
  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    jwt.verify(token, this.jwtSecret, async (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Недействительный токен' });
      }
      
      // Проверяем сессию в базе данных
      const session = db.getSessionByToken(token);
      if (!session) {
        return res.status(403).json({ error: 'Сессия не найдена или истекла' });
      }
      
      req.user = user;
      next();
    });
  };

  // Middleware для проверки прав администратора
  authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }
    next();
  };

  // Запуск сервера
  async start() {
    try {
      // Очистка старых сессий при запуске
      db.deleteExpiredSessions();
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Simple Auth сервер запущен на порту ${this.port}`);
        console.log(`📝 API доступен по адресу: http://localhost:${this.port}`);
        console.log(`🔐 JWT секрет: ${this.jwtSecret.substring(0, 10)}...`);
        console.log(`👤 Администратор по умолчанию: admin / Admin123!`);
        console.log(`💾 База данных: JSON файлы в папке data/`);
        console.log(`\n📊 Доступные эндпоинты:`);
        console.log(`   GET  /api/health          - Проверка здоровья`);
        console.log(`   POST /api/register        - Регистрация`);
        console.log(`   POST /api/login           - Вход`);
        console.log(`   POST /api/logout          - Выход`);
        console.log(`   GET  /api/verify          - Проверка токена`);
        console.log(`   GET  /api/profile         - Профиль пользователя`);
        console.log(`   PUT  /api/profile         - Обновление профиля`);
        console.log(`   PUT  /api/settings        - Обновление настроек`);
        console.log(`   GET  /api/stats           - Статистика (admin)`);
        console.log(`   GET  /api/activity-logs   - Логи активности (admin)`);
        console.log(`   GET  /api/users           - Список пользователей (admin)`);
      });
      
    } catch (error) {
      console.error('Ошибка запуска сервера:', error);
      process.exit(1);
    }
  }
}

// Запуск сервера если файл запущен напрямую
if (require.main === module) {
  const server = new SimpleAuthServer();
  server.start();
}

module.exports = SimpleAuthServer;