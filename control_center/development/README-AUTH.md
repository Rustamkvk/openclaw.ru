# 🔐 Система авторизации Контрольного центра Атласа

## 📋 Обзор

Реализована полноценная система аутентификации и авторизации для многопользовательского режима работы с Контрольным центром Атласа.

## 🏗️ Архитектура

### Компоненты системы:
1. **Frontend (HTML/CSS/JS)** - Интерфейс пользователя
2. **Auth API (Node.js/Express)** - REST API для авторизации (порт 3001)
3. **База данных (SQLite)** - Хранение пользователей, сессий и логов
4. **WebSocket сервер** - Реальный чат с Атласом (порт 8081)
5. **HTTP сервер** - Обслуживание статических файлов (порт 8080)

## 🚀 Быстрый старт

### 1. Установка зависимостей:
```bash
cd ~/.openclaw/workspace/control_center/development
npm install sqlite3 bcryptjs jsonwebtoken express body-parser cors
```

### 2. Запуск всех компонентов:
```bash
node start-all.js
```

Или запустить компоненты по отдельности:
```bash
# В первом терминале: Auth сервер
node auth-server.js

# Во втором терминале: WebSocket сервер  
node websocket-server.js

# В третьем терминале: HTTP сервер для фронтенда
node -e "const http = require('http'); const fs = require('fs'); const path = require('path');
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code == 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});
server.listen(8080, () => {
  console.log('HTTP сервер запущен на порту 8080');
  console.log('Откройте http://localhost:8080 в браузере');
});"
```

### 3. Открыть в браузере:
```
http://localhost:8080
```

## 👤 Данные для входа по умолчанию

- **Имя пользователя:** `admin`
- **Пароль:** `Admin123!`
- **Роль:** Администратор

**⚠️ ВАЖНО:** Смените пароль администратора после первого входа!

## 📊 API Endpoints

### 🔐 Аутентификация
- `POST /api/register` - Регистрация нового пользователя
- `POST /api/login` - Вход в систему
- `POST /api/logout` - Выход из системы
- `GET /api/verify` - Проверка токена
- `GET /api/profile` - Получение профиля пользователя
- `PUT /api/profile` - Обновление профиля
- `PUT /api/settings` - Обновление настроек

### 👨‍💼 Административные (только для admin)
- `GET /api/activity-logs` - Просмотр логов активности
- `POST /api/cleanup-sessions` - Очистка старых сессий

## 🗄️ Структура базы данных

### Таблица `users`:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
)
```

### Таблица `sessions`:
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
)
```

### Таблица `activity_logs`:
```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
)
```

### Таблица `user_settings`:
```sql
CREATE TABLE user_settings (
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
```

## 🔒 Безопасность

### Реализованные меры безопасности:
1. **Хеширование паролей** - bcrypt с солью
2. **JWT токены** - срок действия 7 дней
3. **Валидация сессий** - проверка в базе данных
4. **Защита от CSRF** - CORS политики
5. **Логирование действий** - отслеживание активности
6. **Ролевая модель** - разделение прав доступа

### Рекомендации для продакшена:
1. **Изменить JWT секрет** в `auth-server.js`
2. **Включить HTTPS** для всех соединений
3. **Настроить файрвол** для ограничения доступа
4. **Регулярные бэкапы** базы данных
5. **Мониторинг логов** на подозрительную активность

## 🎨 Интерфейс пользователя

### Реализованные функции:
✅ **Регистрация** - форма с валидацией  
✅ **Вход/выход** - модальные окны с обработкой ошибок  
✅ **Профиль пользователя** - отображение информации  
✅ **Настройки** - тема, язык, уведомления  
✅ **Адаптивный дизайн** - работает на всех устройствах  
✅ **Уведомления** - система всплывающих сообщений  

### Особенности интерфейса:
- **Темная тема** по умолчанию
- **Анимации** и плавные переходы
- **Валидация форм** в реальном времени
- **Автосохранение** токена в localStorage
- **Автопроверка** авторизации каждые 5 минут

## 🔧 Технические детали

### Frontend (auth.js):
- **Класс AuthManager** - управление авторизацией
- **Локальное хранилище** - сохранение токена и данных
- **Интерцепторы запросов** - автоматическое добавление заголовков
- **Обработка ошибок** - пользовательские сообщения

### Backend (auth-server.js):
- **Express.js** - REST API сервер
- **SQLite3** - легковесная база данных
- **JWT** - JSON Web Tokens для аутентификации
- **bcryptjs** - хеширование паролей
- **CORS middleware** - безопасность кросс-доменных запросов

## 🐛 Отладка и логирование

### Проверка состояния:
```bash
# Проверить работу Auth API
curl http://localhost:3001/api/health

# Проверить базу данных
sqlite3 atlas_dashboard.db ".tables"
sqlite3 atlas_dashboard.db "SELECT * FROM users;"

# Просмотр логов
tail -f auth-server.log
```

### Файлы логов:
- `auth-server.log` - логи Auth сервера
- `atlas_dashboard.db` - база данных SQLite
- `activity_logs` таблица - история действий пользователей

## 📈 Планы развития

### Ближайшие улучшения:
1. **Восстановление пароля** по email
2. **Двухфакторная аутентификация** (2FA)
3. **OAuth интеграция** (Google, GitHub)
4. **API ключи** для интеграций
5. **Лимиты запросов** (rate limiting)
6. **Аудит безопасности** - регулярные проверки

### Долгосрочные цели:
1. **Кластерная база данных** для высокой доступности
2. **Микросервисная архитектура**
3. **Docker контейнеризация**
4. **Kubernetes оркестрация**
5. **Мониторинг и алертинг** (Prometheus, Grafana)

## 🤝 Вклад в разработку

### Требования:
- Node.js 16+
- npm или yarn
- Базовые знания SQL

### Процесс разработки:
1. Форк репозитория
2. Создание ветки для фичи
3. Написание тестов
4. Отправка pull request
5. Code review

### Тестирование:
```bash
# Запуск тестов
npm test

# Проверка линтером
npm run lint

# Проверка безопасности
npm audit
```

## 📞 Поддержка

### Полезные ссылки:
- [Документация Express.js](https://expressjs.com/)
- [Документация SQLite](https://www.sqlite.org/docs.html)
- [JWT спецификация](https://jwt.io/)
- [bcrypt документация](https://www.npmjs.com/package/bcryptjs)

### Сообщество:
- [Discord OpenClaw](https://discord.com/invite/clawd)
- [GitHub Issues](https://github.com/openclaw/openclaw/issues)
- [Документация OpenClaw](https://docs.openclaw.ai)

---

**Лицензия:** MIT  
**Версия:** 1.0.0  
**Автор:** Атлас (Atlas)  
**Дата:** 2026-03-30