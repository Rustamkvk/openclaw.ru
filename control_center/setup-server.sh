#!/bin/bash

# Скрипт настройки сервера для Контрольного центра Атласа
# Запускать на сервере 91.213.23.189

set -e  # Выход при ошибке

echo "🚀 Настройка сервера для Контрольного центра Атласа"
echo "=================================================="
echo "Сервер: 91.213.23.189"
echo "Проект: openclaw.ru/control_center"
echo "Дата: $(date)"
echo ""

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
  echo "⚠️  Запустите скрипт с правами root: sudo $0"
  exit 1
fi

# Переменные
PROJECT_ROOT="/Volumes/openclaw.ru/control_center"
DEVELOPMENT_DIR="$PROJECT_ROOT/development"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$DEVELOPMENT_DIR/logs"
CONFIG_FILE="$DEVELOPMENT_DIR/config.js"

echo "📁 Проверка структуры проекта..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DEVELOPMENT_DIR/data"

echo "✅ Структура создана"
echo ""

echo "🔧 Настройка прав доступа..."
chmod -R 755 "$PROJECT_ROOT"
chown -R www-data:www-data "$PROJECT_ROOT" 2>/dev/null || echo "⚠️  Пользователь www-data не найден, продолжаем..."

echo "✅ Права настроены"
echo ""

echo "📦 Установка зависимостей Node.js..."
cd "$DEVELOPMENT_DIR"
if [ -f "package.json" ]; then
  npm install --production
  echo "✅ Зависимости установлены"
else
  echo "⚠️  Файл package.json не найден"
fi
echo ""

echo "🗄️  Настройка базы данных MySQL..."
echo "Создание базы данных: openclaw_bd"
mysql -e "CREATE DATABASE IF NOT EXISTS openclaw_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || echo "⚠️  Не удалось подключиться к MySQL"

echo "Создание пользователя: openclaw_user"
mysql -e "CREATE USER IF NOT EXISTS 'openclaw_user'@'localhost' IDENTIFIED BY 'Admin123!';" 2>/dev/null || echo "⚠️  Не удалось создать пользователя"

echo "Назначение прав..."
mysql -e "GRANT ALL PRIVILEGES ON openclaw_bd.* TO 'openclaw_user'@'localhost';" 2>/dev/null || echo "⚠️  Не удалось назначить права"
mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || echo "⚠️  Не удалось обновить права"

echo "✅ База данных настроена"
echo ""

echo "🔐 Настройка безопасности..."
# Создание безопасного JWT секрета
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/your_super_secret_jwt_key_change_this_for_production/$JWT_SECRET/" "$CONFIG_FILE" 2>/dev/null || echo "⚠️  Не удалось обновить JWT секрет"

# Создание безопасного пароля БД
DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-16)
sed -i "s/'Admin123!'/'$DB_PASSWORD'/" "$CONFIG_FILE" 2>/dev/null || echo "⚠️  Не удалось обновить пароль БД"

echo "✅ Безопасность настроена"
echo ""

echo "🔄 Настройка автоматического обновления индекса памяти..."
# Определяем путь к Node.js
NODE_PATH=$(which node 2>/dev/null || echo "/usr/bin/node")
echo "📦 Путь к Node.js: $NODE_PATH"

# Создание cron задачи
CRON_JOB="*/15 * * * * cd $DEVELOPMENT_DIR && $NODE_PATH update-memory-index.js >> $LOG_DIR/memory-index-update.log 2>&1"
(crontab -l 2>/dev/null | grep -v "update-memory-index"; echo "$CRON_JOB") | crontab -

echo "✅ Cron задача добавлена"
echo ""

echo "🛡️  Настройка брандмауэра..."
# Открытие портов
ufw allow 8082/tcp 2>/dev/null || echo "⚠️  UFW не найден, проверьте порты вручную"
ufw allow 3001/tcp 2>/dev/null || echo "⚠️  UFW не найден, проверьте порты вручную"
ufw allow 8081/tcp 2>/dev/null || echo "⚠️  UFW не найден, проверьте порты вручную"

echo "✅ Брандмауэр настроен"
echo ""

echo "🚀 Настройка автозапуска..."
# Создание systemd службы
cat > /etc/systemd/system/atlas-control-center.service << EOF
[Unit]
Description=Atlas Control Center
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$DEVELOPMENT_DIR
ExecStart=/usr/bin/node start-all.js
Restart=on-failure
RestartSec=10
StandardOutput=file:$LOG_DIR/service.log
StandardError=file:$LOG_DIR/service-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable atlas-control-center.service 2>/dev/null || echo "⚠️  Не удалось включить автозагрузку"

echo "✅ Автозапуск настроен"
echo ""

echo "📊 Создание тестовой таблицы в БД..."
mysql openclaw_bd << EOF 2>/dev/null || echo "⚠️  Не удалось создать тестовую таблицу"
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'user', 'guest') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(50),
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  FULLTEXT idx_content (content)
);

INSERT IGNORE INTO users (username, password_hash, role) VALUES 
('admin', '\$2b\$10\$YourHashedPasswordHere', 'admin');
EOF

echo "✅ Тестовые таблицы созданы"
echo ""

echo "🎉 Настройка завершена!"
echo ""
echo "📋 Сводка:"
echo "   • Проект: $PROJECT_ROOT"
echo "   • Frontend: http://91.213.23.189:8082"
echo "   • API: http://91.213.23.189:3001"
echo "   • WebSocket: ws://91.213.23.189:8081"
echo "   • База данных: openclaw_bd"
echo "   • Пользователь БД: openclaw_user"
echo "   • Пароль БД: $DB_PASSWORD"
echo "   • JWT секрет: $JWT_SECRET"
echo ""
echo "🚀 Запуск сервиса:"
echo "   sudo systemctl start atlas-control-center.service"
echo ""
echo "📊 Проверка статуса:"
echo "   sudo systemctl status atlas-control-center.service"
echo ""
echo "📝 Логи:"
echo "   tail -f $LOG_DIR/service.log"
echo ""
echo "⚠️  ВАЖНО:"
echo "   1. Сохраните пароль БД и JWT секрет в безопасном месте"
echo "   2. Смените пароль администратора после первого входа"
echo "   3. Настройте SSL/TLS для защищенного соединения"
echo ""
echo "✅ Готово к работе!"