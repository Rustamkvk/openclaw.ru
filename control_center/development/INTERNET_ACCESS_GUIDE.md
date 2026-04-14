# 🌐 РУКОВОДСТВО ПО ДОСТУПУ К КОНТРОЛЬНОМУ ЦЕНТРУ ЧЕРЕЗ ИНТЕРНЕТ

## 📋 ОГЛАВЛЕНИЕ
1. [Локальные ссылки для доступа](#локальные-ссылки-для-доступа)
2. [Настройка доступа через интернет](#настройка-доступа-через-интернет)
3. [Безопасность и авторизация](#безопасность-и-авторизация)
4. [Настройка домена и SSL](#настройка-домена-и-ssl)
5. [Мониторинг и логирование](#мониторинг-и-логирование)
6. [Устранение неполадок](#устранение-неполадок)

---

## 🔗 **ЛОКАЛЬНЫЕ ССЫЛКИ ДЛЯ ДОСТУПА**

### 🚀 **После запуска Контрольного центра:**

```bash
# Запуск системы
cd ~/.openclaw/workspace/control_center/development
./check-and-run.sh
```

### 🌐 **Доступные локальные адреса:**

| Компонент | Порт | Ссылка | Назначение |
|-----------|------|--------|------------|
| **Главный интерфейс** | 8080 | [http://localhost:8080](http://localhost:8080) | Веб-интерфейс Контрольного центра |
| **API авторизации** | 3001 | [http://localhost:3001](http://localhost:3001) | REST API для авторизации |
| **WebSocket чат** | 8081 | [ws://localhost:8081](ws://localhost:8081) | Чат в реальном времени |

### 🔑 **Данные для входа по умолчанию:**

- **Имя пользователя:** `admin`
- **Пароль:** `Admin123!`
- **Роль:** Администратор

**⚠️ ВАЖНО:** Смените пароль администратора после первого входа!

---

## 🌍 **НАСТРОЙКА ДОСТУПА ЧЕРЕЗ ИНТЕРНЕТ**

### **1. ПРОВЕРКА ТЕКУЩЕЙ КОНФИГУРАЦИИ**

#### **Проверка IP адреса:**
```bash
# Внутренний IP (локальная сеть)
ifconfig | grep "inet " | grep -v 127.0.0.1

# Внешний IP (интернет)
curl ifconfig.me
```

#### **Проверка открытых портов:**
```bash
# Проверка, какие порты слушает система
sudo lsof -i -P -n | grep LISTEN

# Проверка доступности портов извне
nc -zv ваш_внешний_ip 8080
nc -zv ваш_внешний_ip 3001
```

### **2. НАСТРОЙКА БРАНДМАУЭРА**

#### **macOS (pf):**
```bash
# Проверка текущих правил
sudo pfctl -s rules

# Временное открытие портов
sudo pfctl -E
echo "pass in proto tcp from any to any port {8080, 3001, 8081}" | sudo pfctl -f -
```

#### **Ubuntu/Debian (ufw):**
```bash
# Установка и настройка ufw
sudo apt install ufw
sudo ufw allow 8080/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 8081/tcp
sudo ufw enable
```

### **3. НАСТРОЙКА NGINX КАК ОБРАТНОГО ПРОКСИ**

#### **Установка Nginx:**
```bash
# macOS
brew install nginx

# Ubuntu/Debian
sudo apt install nginx
```

#### **Конфигурация Nginx (`/usr/local/etc/nginx/nginx.conf` или `/etc/nginx/nginx.conf`):**
```nginx
# Основной конфиг для Контрольного центра
server {
    listen 80;
    server_name ваш_домен.com;  # или ваш_внешний_ip
    
    # Главный интерфейс
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API авторизации
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket для чата
    location /ws/ {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### **Запуск Nginx:**
```bash
# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo nginx -s reload

# Запуск Nginx
sudo nginx
```

### **4. ИСПОЛЬЗОВАНИЕ NGINX (РЕКОМЕНДУЕМЫЙ СПОСОБ)**

После настройки Nginx доступ будет по:
- **Главный интерфейс:** `http://ваш_домен.com` или `http://ваш_внешний_ip`
- **API:** `http://ваш_домен.com/api/`
- **WebSocket:** `ws://ваш_домен.com/ws/`

---

## 🔒 **БЕЗОПАСНОСТЬ И АВТОРИЗАЦИЯ**

### **1. СМЕНА ПАРОЛЕЙ ПО УМОЛЧАНИЮ**

```bash
# Создание скрипта для смены пароля
cat > change_admin_password.sh << 'EOF'
#!/bin/bash
echo "Смена пароля администратора..."
cd ~/.openclaw/workspace/control_center/development
node -e "
const db = require('./simple-db');
db.changePassword('admin', 'Новый_Сложный_Пароль123!');
console.log('✅ Пароль администратора изменен');
"
EOF

chmod +x change_admin_password.sh
./change_admin_password.sh
```

### **2. НАСТРОЙКА БЕЗОПАСНОСТИ NGINX**

```nginx
# Ограничение доступа по IP (опционально)
location / {
    allow 192.168.1.0/24;  # Ваша локальная сеть
    allow 10.0.0.0/8;      # Дополнительные сети
    deny all;              # Запретить всем остальным
    
    proxy_pass http://localhost:8080;
    # ... остальные proxy настройки
}

# Базовая аутентификация (дополнительный уровень)
location / {
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://localhost:8080;
    # ... остальные proxy настройки
}
```

#### **Создание файла с паролями:**
```bash
# Установка утилиты для создания .htpasswd
sudo apt install apache2-utils  # Ubuntu/Debian
brew install apache2-utils      # macOS

# Создание файла с паролями
sudo htpasswd -c /etc/nginx/.htpasswd username
```

---

## 📡 **НАСТРОЙКА ДОМЕНА И SSL**

### **1. ПОЛУЧЕНИЕ БЕСПЛАТНОГО SSL СЕРТИФИКАТА (Let's Encrypt)**

```bash
# Установка Certbot
# macOS
brew install certbot

# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d ваш_домен.com

# Автоматическое обновление сертификатов
sudo certbot renew --dry-run
```

### **2. КОНФИГУРАЦИЯ NGINX С SSL**

```nginx
server {
    listen 443 ssl http2;
    server_name ваш_домен.com;
    
    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/ваш_домен.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ваш_домен.com/privkey.pem;
    
    # Настройки SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Перенаправление с HTTP на HTTPS
    location / {
        proxy_pass https://localhost:8080;
        # ... остальные proxy настройки
    }
}

server {
    listen 80;
    server_name ваш_домен.com;
    return 301 https://$server_name$request_uri;
}
```

### **3. НАСТРОЙКА ДИНАМИЧЕСКОГО DNS (ЕСЛИ НЕТ СТАТИЧЕСКОГО IP)**

#### **Использование сервисов динамического DNS:**
1. **No-IP** (бесплатно): https://www.noip.com/
2. **DuckDNS** (бесплатно): https://www.duckdns.org/
3. **FreeDNS** (бесплатно): https://freedns.afraid.org/

#### **Скрипт для автоматического обновления IP:**
```bash
#!/bin/bash
# update_ddns.sh
DOMAIN="ваш_домен.duckdns.org"
TOKEN="ваш_токен_duckdns"

CURRENT_IP=$(curl -s ifconfig.me)
UPDATE_URL="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$CURRENT_IP"

curl -s $UPDATE_URL
echo "IP обновлен: $CURRENT_IP"
```

#### **Добавление в cron для автоматического обновления:**
```bash
# Каждые 5 минут проверяем и обновляем IP
*/5 * * * * /path/to/update_ddns.sh >> /tmp/ddns_update.log 2>&1
```

---

## 📊 **МОНИТОРИНГ И ЛОГИРОВАНИЕ**

### **1. НАСТРОЙКА ЛОГОВ NGINX**

```nginx
# В конфигурации Nginx
http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
}
```

### **2. МОНИТОРИНГ ДОСТУПНОСТИ**

```bash
#!/bin/bash
# monitor_control_center.sh
URL="http://ваш_домен.com"
LOG_FILE="/tmp/control_center_monitor.log"

if curl -s --head --request GET $URL | grep "200 OK" > /dev/null; then
    echo "$(date): ✅ Контрольный центр доступен" >> $LOG_FILE
else
    echo "$(date): ❌ Контрольный центр недоступен" >> $LOG_FILE
    # Можно добавить отправку уведомления
    # openclaw message send --channel telegram --target 944221719 --message "Контрольный центр недоступен!"
fi
```

#### **Добавление в cron:**
```bash
# Проверка каждые 10 минут
*/10 * * * * /path/to/monitor_control_center.sh
```

### **3. ПРОСМОТР ЛОГОВ В РЕАЛЬНОМ ВРЕМЕНИ**

```bash
# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Логи Контрольного центра
tail -f ~/.openclaw/workspace/control_center/development/data/logs.json

# Логи авторизации
tail -f /tmp/auth_server.log
```

---

## 🛠️ **УСТРАНЕНИЕ НЕПОЛАДОК**

### **ПРОБЛЕМА: Не могу подключиться из интернета**

#### **Решение:**
1. **Проверка брандмауэра:**
   ```bash
   sudo ufw status  # Ubuntu
   sudo pfctl -s rules  # macOS
   ```

2. **Проверка проброса портов на роутере:**
   - Зайдите в настройки роутера (обычно 192.168.1.1 или 192.168.0.1)
   - Найдите раздел "Port Forwarding" или "Виртуальные серверы"
   - Добавьте правила для портов 80, 443, 8080, 3001, 8081
   - Направьте на внутренний IP вашего компьютера

3. **Проверка провайдера:**
   - Некоторые провайдеры блокируют входящие соединения
   - Проверьте, не используете ли вы CGNAT
   - Свяжитесь с техподдержкой провайдера

### **ПРОБЛЕМА: Ошибки SSL/HTTPS**

#### **Решение:**
1. **Проверка сертификатов:**
   ```bash
   sudo certbot certificates
   sudo nginx -t
   ```

2. **Обновление сертификатов:**
   ```bash
   sudo certbot renew --force-renewal
   sudo nginx -s reload
   ```

### **ПРОБЛЕМА: Медленная работа через интернет**

#### **Решение:**
1. **Оптимизация Nginx:**
   ```nginx
   # Кэширование статических файлов
   location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   
   # Сжатие Gzip
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **Оптимизация Контрольного центра:**
   - Минификация CSS и JavaScript
   - Использование CDN для библиотек
   - Включение кэширования в браузере

---

## 🚀 **БЫСТРЫЙ СТАРТ**

### **Минимальная настройка для доступа через интернет:**

1. **Запустите Контрольный центр:**
   ```bash
   cd ~/.openclaw/workspace/control_center/development
   ./check-and-run.sh
   ```

2. **Узнайте ваш внешний IP:**
   ```bash
   curl ifconfig.me
   ```

3. **Настройте проброс портов на роутере:**
   - Порт 8080 → ваш_внутренний_ip:8080
   - Порт 3001 → ваш_внутренний_ip:3001 (опционально)
   - Порт 8081 → ваш_внутренний_ip:8081 (опционально)

4. **Откройте в браузере:**
   ```
   http://ваш_внешний_ip:8080
   ```

5. **Войдите с данными:**
   - Логин: `admin`
   - Пароль: `Admin123!`

---

## 📞 **ПОДДЕРЖКА И КОНТАКТЫ**

### **Если возникли проблемы:**

1. **Проверьте логи:**
   ```bash
   # Логи Контрольного центра
   tail -f ~/.openclaw/workspace/control_center/development/data/logs.json
   
   # Логи Nginx
   tail -f /var/log/nginx/error.log
   ```

2. **Проверьте доступность портов:**
   ```bash
   # Изнутри сети
   curl http://localhost:8080
   
   # Из интернета (с другого устройства)
   curl http://ваш_внешний_ip:8080
   ```

3. **С