# Контрольный центр Атласа - Production

## 🚀 Размещение на сервере 91.213.23.189

### 📋 Информация о сервере
- **IP:** 91.213.23.189
- **Папка:** openclaw.ru
- **База данных:** MySQL-8.4 (openclaw_bd)
- **Панель управления:** Open Server Panel (OSP)
- **Дата развертывания:** 2026-04-06

### 🏗️ Структура проекта
```
openclaw.ru/
├── control_center/          # Основной проект
│   ├── production/         # Продакшн версия
│   ├── development/        # Разработка (текущая)
│   ├── staging/           # Предрелизное тестирование
│   ├── backups/           # Резервные копии
│   ├── api/              # API сервер
│   └── data/             # Данные приложения
├── .osp/                  # Конфигурация OSP (скрытая)
└── README.md             # Этот файл
```

### 🔧 Настройка окружения

#### 1. Настройка OSP (.osp/config.json)
```json
{
  "project_name": "Контрольный центр Атласа",
  "document_root": "control_center/development",
  "php_version": "8.2",
  "mysql_database": "openclaw_bd",
  "mysql_user": "openclaw_user",
  "mysql_password": "secure_password",
  "domains": ["openclaw.local", "91.213.23.189"]
}
```

#### 2. Настройка базы данных
```sql
-- Создание базы данных (уже создана)
CREATE DATABASE IF NOT EXISTS openclaw_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создание пользователя
CREATE USER 'openclaw_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON openclaw_bd.* TO 'openclaw_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. Конфигурация проекта
Создать файл `control_center/development/config.js`:
```javascript
const config = {
  server: {
    port: 8082,
    host: '0.0.0.0'
  },
  database: {
    host: 'localhost',
    port: 3306,
    database: 'openclaw_bd',
    user: 'openclaw_user',
    password: 'secure_password'
  },
  auth: {
    secret: 'your_jwt_secret_key',
    expiresIn: '24h'
  }
};
```

### 🚀 Запуск проекта

#### Вариант A: Через OSP
1. Открыть Open Server Panel
2. Выбрать домен `openclaw.local`
3. Запустить модули: Apache, MySQL, Node.js
4. Открыть http://openclaw.local:8082

#### Вариант B: Ручной запуск
```bash
cd /Volumes/openclaw.ru/control_center/development
npm install
node start-all.js
```

### 📊 Доступ к проекту

#### Локально:
- **Frontend:** http://localhost:8082
- **API:** http://localhost:3001
- **WebSocket:** ws://localhost:8081

#### По сети:
- **Frontend:** http://91.213.23.189:8082
- **API:** http://91.213.23.189:3001
- **WebSocket:** ws://91.213.23.189:8081

### 🔐 Учетные данные по умолчанию
```
Администратор:
- Логин: admin
- Пароль: Admin123!
```

### ⚠️ Важные заметки

1. **Безопасность:**
   - Сменить пароль администратора после первого входа
   - Настроить SSL/TLS для защищенного соединения
   - Ограничить доступ по IP при необходимости

2. **Производительность:**
   - Настроить кэширование
   - Оптимизировать запросы к БД
   - Использовать CDN для статических файлов

3. **Резервное копирование:**
   - Автоматические бэкапы в папку `backups/`
   - Ежедневное копирование базы данных
   - Версионность файлов проекта

### 🐛 Отладка и логи

#### Логи приложения:
- `development/http-server.log` - HTTP сервер
- `development/auth-server.log` - Auth сервер  
- `development/websocket-server.log` - WebSocket сервер

#### Логи OSP:
- `.osp/logs/` - логи панели управления
- `.osp/config.json` - конфигурация

### 🔄 Обновление проекта

#### Автоматическое обновление:
```bash
# Скрипт для обновления с GitHub/GitLab
cd /Volumes/openclaw.ru/control_center/development
git pull origin main
npm install
npm run build
```

#### Ручное обновление:
1. Остановить серверы
2. Создать бэкап
3. Скопировать новые файлы
4. Запустить серверы
5. Проверить работоспособность

### 📞 Контакты и поддержка

- **Разработчик:** Атлас (OpenClaw AI Assistant)
- **Владелец:** Рустам
- **Дата создания:** 2026-04-06
- **Статус:** 🟢 В разработке

---

**Последнее обновление:** 2026-04-06  
**Версия:** 1.0.0  
**Статус развертывания:** ✅ Успешно