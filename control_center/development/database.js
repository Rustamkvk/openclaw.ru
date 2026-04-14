const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    // Путь к базе данных
    this.dbPath = path.join(__dirname, 'atlas_dashboard.db');
    this.db = null;
  }

  // Инициализация базы данных
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка подключения к базе данных:', err);
          reject(err);
          return;
        }
        
        console.log('✅ Подключено к SQLite базе данных');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  // Создание таблиц
  async createTables() {
    return new Promise((resolve, reject) => {
      // Таблица пользователей
      const usersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          is_active BOOLEAN DEFAULT 1
        )
      `;

      // Таблица сессий
      const sessionsTable = `
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_token TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      // Таблица логов действий
      const logsTable = `
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `;

      // Таблица настроек пользователей
      const userSettingsTable = `
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          theme TEXT DEFAULT 'dark',
          language TEXT DEFAULT 'ru',
          notifications_enabled BOOLEAN DEFAULT 1,
          email_notifications BOOLEAN DEFAULT 0,
          telegram_notifications BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      this.db.serialize(() => {
        this.db.run(usersTable);
        this.db.run(sessionsTable);
        this.db.run(logsTable);
        this.db.run(userSettingsTable);
        
        // Создаем индекс для быстрого поиска
        this.db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_logs_user_time ON activity_logs(user_id, created_at)');
        
        console.log('✅ Таблицы базы данных созданы');
        
        // Создаем администратора по умолчанию
        this.createDefaultAdmin().then(resolve).catch(reject);
      });
    });
  }

  // Создание администратора по умолчанию
  async createDefaultAdmin() {
    const adminUsername = 'admin';
    const adminEmail = 'admin@atlas.local';
    const adminPassword = 'Admin123!';
    
    try {
      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        await this.createUser({
          username: adminUsername,
          email: adminEmail,
          password_hash: hashedPassword,
          role: 'admin'
        });
        
        console.log('✅ Администратор по умолчанию создан');
        console.log('👤 Логин:', adminUsername);
        console.log('🔑 Пароль:', adminPassword);
        console.log('⚠️ Смените пароль после первого входа!');
      }
    } catch (error) {
      console.error('Ошибка создания администратора:', error);
    }
  }

  // Методы для работы с пользователями
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const { username, email, password_hash, role = 'user' } = userData;
      
      const sql = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [username, email, password_hash, role], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const userId = this.lastID;
        
        // Создаем настройки по умолчанию для пользователя
        const settingsSql = `
          INSERT INTO user_settings (user_id)
          VALUES (?)
        `;
        
        this.db.run(settingsSql, [userId], (err) => {
          if (err) {
            console.error('Ошибка создания настроек пользователя:', err);
          }
          resolve(userId);
        });
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      this.db.get(sql, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      this.db.get(sql, [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Методы для работы с сессиями
  async createSession(sessionData) {
    return new Promise((resolve, reject) => {
      const { user_id, session_token, expires_at, ip_address, user_agent } = sessionData;
      
      const sql = `
        INSERT INTO sessions (user_id, session_token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [user_id, session_token, expires_at, ip_address, user_agent], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getSessionByToken(token) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT s.*, u.username, u.email, u.role, u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND s.expires_at > datetime('now')
      `;
      
      this.db.get(sql, [token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async deleteSession(token) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM sessions WHERE session_token = ?';
      this.db.run(sql, [token], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  async deleteExpiredSessions() {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM sessions WHERE expires_at <= datetime('now')";
      this.db.run(sql, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Методы для логов
  async logActivity(logData) {
    return new Promise((resolve, reject) => {
      const { user_id, action, details, ip_address, user_agent } = logData;
      
      const sql = `
        INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [user_id, action, details, ip_address, user_agent], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getActivityLogs(userId, limit = 100) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT l.*, u.username
        FROM activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
      `;
      
      const params = [];
      
      if (userId) {
        sql += ' WHERE l.user_id = ?';
        params.push(userId);
      }
      
      sql += ' ORDER BY l.created_at DESC LIMIT ?';
      params.push(limit);
      
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Методы для настроек пользователей
  async getUserSettings(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM user_settings WHERE user_id = ?';
      this.db.get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async updateUserSettings(userId, settings) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(settings);
      const values = Object.values(settings);
      
      if (fields.length === 0) {
        resolve(false);
        return;
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const sql = `
        UPDATE user_settings 
        SET ${setClause}, updated_at = datetime('now')
        WHERE user_id = ?
      `;
      
      this.db.run(sql, [...values, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Закрытие соединения
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Ошибка закрытия базы данных:', err);
        } else {
          console.log('✅ Соединение с базой данных закрыто');
        }
      });
    }
  }
}

// Экспортируем синглтон
const db = new Database();
module.exports = db;