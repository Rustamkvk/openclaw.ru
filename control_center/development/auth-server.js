const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

class AuthServer {
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
      origin: ['http://localhost:8081', 'http://127.0.0.1:8081'],
      credentials: true
    }));
    
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Логирование запросов
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Проверка здоровья
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }
        
        const existingEmail = await db.getUserByEmail(email);
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
        const user = await db.getUserByUsername(username);
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
        
        await db.createSession({
          user_id: user.id,
          session_token: token,
          expires_at: expiresAt.toISOString(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
        
        // Обновление времени последнего входа
        await this.updateLastLogin(user.id);
        
        // Логирование
        await db.logActivity({
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
          await db.deleteSession(token);
          
          // Логирование
          await db.logActivity({
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
        const user = await db.getUserById(req.user.userId);
        
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
        const user = await db.getUserById(req.user.userId);
        const settings = await db.getUserSettings(req.user.userId);
        
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
        
        const user = await db.getUserById(userId);
        
        // Обновление email
        if (email && email !== user.email) {
          const existingEmail = await db.getUserByEmail(email);
          if (existingEmail) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
          }
          
          // Обновляем email в базе
          await this.updateUserEmail(userId, email);
          
          // Логирование
          await db.logActivity({
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
          await this.updateUserPassword(userId, hashedPassword);
          
          // Логирование
          await db.logActivity({
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
        
        const updated = await db.updateUserSettings(userId, settings);
        
        if (updated) {
          // Логирование
          await db.logActivity({
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
        const logs = await db.getActivityLogs(userId || null, parseInt(limit));
        
        res.json({ success: true, logs });
        
      } catch (error) {
        console.error('Ошибка получения логов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
      }
    });

    // Очистка старых сессий (крон задача)
    this.app.post('/api/cleanup-sessions', this.authenticateToken, this.authorizeAdmin, async (req, res) => {
      try {
        const deletedCount = await db.deleteExpiredSessions();
        res.json({ success: true, deleted: deletedCount });
        
      } catch (error) {
        console.error('Ошибка очистки сессий:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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
      const session = await db.getSessionByToken(token);
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

  // Вспомогательные методы
  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      const sql = "UPDATE users SET last_login = datetime('now') WHERE id = ?";
      db.db.run(sql, [userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  async updateUserEmail(userId, email) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET email = ? WHERE id = ?';
      db.db.run(sql, [email, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  async updateUserPassword(userId, passwordHash) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
      db.db.run(sql, [passwordHash, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Запуск сервера
  async start() {
    try {
      // Инициализация базы данных
      await db.init();
      
      // Очистка старых сессий при запуске
      await db.deleteExpiredSessions();
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Auth сервер запущен на порту ${this.port}`);
        console.log(`📝 API доступен по адресу: http://localhost:${this.port}`);
        console.log(`🔐 JWT секрет: ${this.jwtSecret.substring(0, 10)}...`);
        console.log(`👤 Администратор по умолчанию: admin / Admin123!`);
      });
      
    } catch (error) {
      console.error('Ошибка запуска сервера:', error);
      process.exit(1);
    }
  }
}

// Запуск сервера если файл запущен напрямую
if (require.main === module) {
  const server = new AuthServer();
  server.start();
}

module.exports = AuthServer;