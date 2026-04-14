# 🚀 Руководство по развертыванию на сервере

## 📋 Информация о сервере
- **IP адрес:** 91.213.23.189
- **Папка проекта:** `/Volumes/openclaw.ru/control_center/`
- **База данных:** MySQL 8.4 (`openclaw_bd`)
- **Панель управления:** Open Server Panel (OSP)
- **Операционная система:** Windows Server 2019
- **Дата развертывания:** 2026-04-06

## 🎯 Цель
Развернуть Контрольный центр Атласа на удаленном сервере для публичного доступа.

## 📁 Структура проекта на сервере
```
openclaw.ru/
├── control_center/              # Основной проект
│   ├── development/            # Разработка (текущая версия)
│   │   ├── index.html         # Frontend
│   │   ├── config.js          # Конфигурация
│   │   ├── package.json       # Зависимости Node.js
│   │   ├── start-all.js       # Скрипт запуска
│   │   ├── *.js              # Серверные скрипты
│   │   ├── *.sh              # Bash скрипты
│   │   └── logs/             # Логи приложения
│   ├── production/            # Продакшн версия (резерв)
│   ├── staging/              # Предрелизное тестирование
│   ├── backups/              # Резервные копии
│   ├── api/                  # API сервер
│   ├── data/                 # Данные приложения
│   ├── README.md             # Документация
│   ├── DEPLOYMENT_GUIDE.md   # Это руководство
│   └── setup-server.sh       # Скрипт настройки
├── .osp/                     # Конфигурация OSP (скрытая)
│   ├── config.json          # Основная конфигурация
│   ├── project.ini          # Конфигурация проекта
│   └── .htaccess           # Настройки Apache
└── memory_index.json        # Индекс памяти (симлинк)
```

## 🔧 Предварительные требования

### 1. На сервере должны быть установлены:
- [x] **Node.js** (версия 16+)
- [x] **MySQL 8.4** с базой `openclaw_bd`
- [x] **Open Server Panel** с настроенным доменом
- [x] **Git** (опционально, для обновлений)

### 2. Открытые порты:
- **8082** - HTTP сервер (frontend)
- **3001** - API сервер
- **8081** - WebSocket сервер
- **3306** - MySQL (локально)
- **80/443** - OSP (Apache/Nginx)

### 3. Права доступа:
- Чтение/запись в папку `control_center/`
- Доступ к MySQL с правами на `openclaw_bd`
- Запуск Node.js процессов

## 🚀 Быстрое развертывание

### Шаг 1: Подготовка сервера
```bash
# 1. Подключиться к серверу по SSH/RDP
# 2. Перейти в папку проекта
cd /Volumes/openclaw.ru/control_center/

# 3. Запустить скрипт настройки (требует root)
sudo ./setup-server.sh
```

### Шаг 2: Настройка базы данных
```sql
-- Подключиться к MySQL
mysql -u root -p

-- Создать базу данных (если не создана)
CREATE DATABASE openclaw_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создать пользователя
CREATE USER 'openclaw_user'@'localhost' IDENTIFIED BY 'secure_password';

-- Назначить права
GRANT ALL PRIVILEGES ON openclaw_bd.* TO 'openclaw_user'@'localhost';
FLUSH PRIVILEGES;
```

### Шаг 3: Установка зависимостей
```bash
cd /Volumes/openclaw.ru/control_center/development
npm install --production
```

### Шаг 4: Запуск приложения
```bash
# Вариант A: Ручной запуск
cd /Volumes/openclaw.ru/control_center/development
node start-all.js

# Вариант B: Через systemd службу
sudo systemctl start atlas-control-center.service
sudo systemctl enable atlas-control-center.service
```

### Шаг 5: Проверка
```bash
# Проверить статус службы
sudo systemctl status atlas-control-center.service

# Проверить логи
tail -f /Volumes/openclaw.ru/control_center/development/logs/service.log

# Проверить доступность
curl http://localhost:8082
curl http://localhost:3001/api/health
```

## 🌐 Настройка доступа из интернета

### 1. Настройка OSP (Open Server Panel)
1. Открыть Open Server Panel
2. Выбрать домен `openclaw.local` или создать новый
3. Настроить Document Root: `control_center/development`
4. Включить модули: Apache, MySQL, Node.js
5. Сохранить настройки

### 2. Настройка брандмауэра Windows
```powershell
# Открыть порты в брандмауэре
New-NetFirewallRule -DisplayName "Atlas-HTTP-8082" -Direction Inbound -Protocol TCP -LocalPort 8082 -Action Allow
New-NetFirewallRule -DisplayName "Atlas-API-3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "Atlas-WebSocket-8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

### 3. Настройка роутера (если есть)
- Пробросить порты 8082, 3001, 8081 на IP сервера
- Настроить DDNS если нет статического IP

## 🔐 Настройка безопасности

### 1. Смена паролей по умолчанию
```javascript
// В config.js заменить:
database.password = 'новый_сложный_пароль';
auth.secret = 'новый_jwt_секрет';
```

### 2. Настройка HTTPS
```bash
# Генерация SSL сертификата (Let's Encrypt)
certbot certonly --webroot -w /Volumes/openclaw.ru/control_center/development -d openclaw.ru

# Настройка в config.js
server.publicUrl = 'https://openclaw.ru:8082';
auth.cookieOptions.secure = true;
```

### 3. Ограничение доступа по IP
```javascript
// В config.js добавить:
security.allowedIPs = ['91.213.23.189', '192.168.1.0/24'];
```

## 📊 Мониторинг и логи

### Логи приложения:
```bash
# HTTP сервер
tail -f /Volumes/openclaw.ru/control_center/development/http-server.log

# Auth сервер
tail -f /Volumes/openclaw.ru/control_center/development/auth-server.log

# WebSocket сервер
tail -f /Volumes/openclaw.ru/control_center/development/websocket-server.log

# Общие логи службы
tail -f /Volumes/openclaw.ru/control_center/development/logs/service.log
```

### Мониторинг ресурсов:
```bash
# Использование памяти
pm2 monit

# Логи в реальном времени
pm2 logs

# Статус процессов
pm2 status
```

## 🔄 Обновление проекта

### Автоматическое обновление (если настроен Git):
```bash
cd /Volumes/openclaw.ru/control_center/development
git pull origin main
npm install
npm run build
sudo systemctl restart atlas-control-center.service
```

### Ручное обновление:
1. Остановить службу: `sudo systemctl stop atlas-control-center.service`
2. Создать бэкап: `./backup-script.js`
3. Скопировать новые файлы
4. Установить зависимости: `npm install`
5. Запустить службу: `sudo systemctl start atlas-control-center.service`
6. Проверить работоспособность

## 🐛 Устранение неполадок

### Проблема 1: Порт занят
```bash
# Найти процесс, использующий порт
netstat -ano | findstr :8082
# Завершить процесс
taskkill /PID <PID> /F
```

### Проблема 2: Ошибка подключения к БД
```bash
# Проверить доступность MySQL
mysql -u openclaw_user -p -e "SHOW DATABASES;"

# Проверить права
mysql -u root -p -e "SHOW GRANTS FOR 'openclaw_user'@'localhost';"
```

### Проблема 3: Служба не запускается
```bash
# Проверить логи службы
sudo journalctl -u atlas-control-center.service -f

# Проверить конфигурацию
sudo systemctl daemon-reload
```

### Проблема 4: Нет доступа из интернета
```bash
# Проверить брандмауэр
netsh advfirewall firewall show rule name="Atlas-HTTP-8082"

# Проверить проброс портов на роутере
```

## 📞 Контакты и поддержка

- **Разработчик:** Атлас (OpenClaw AI Assistant)
- **Владелец проекта:** Рустам
- **Дата создания:** 2026-04-06
- **Статус:** 🟢 В разработке

### Каналы поддержки:
1. **Локальные логи:** `control_center/development/logs/`
2. **Логи OSP:** `.osp/logs/`
3. **Мониторинг:** PM2 / systemd
4. **Резервные копии:** `control_center/backups/`

## ✅ Чеклист развертывания

- [ ] Скопированы все файлы проекта
- [ ] Установлены зависимости Node.js
- [ ] Настроена база данных MySQL
- [ ] Созданы пользователи и права
- [ ] Настроена конфигурация в config.js
- [ ] Открыты порты в брандмауэре
- [ ] Настроена служба автозапуска
- [ ] Протестирована локальная работа
- [ ] Протестирован доступ из интернета
- [ ] Настроены резервные копии
- [ ] Документированы учетные данные

---

**Последнее обновление:** 2026-04-06  
**Версия руководства:** 1.0.0  
**Статус развертывания:** ✅ Файлы скопированы, требуется настройка на сервере