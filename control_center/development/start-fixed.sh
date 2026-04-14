#!/bin/bash

# Исправленный скрипт запуска Контрольного центра Атласа с портом 8082

echo "🚀 Запуск Контрольного центра Атласа (исправленная версия)"
echo "=========================================================="
echo ""

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

# Переходим в директорию
cd "$(dirname "$0")" || exit 1
echo "📁 Рабочая директория: $(pwd)"
echo ""

# Проверяем необходимые файлы
echo "🔍 Проверка файлов..."
REQUIRED_FILES=("simple-http-server.js" "simple-auth-no-deps.js" "websocket-server.js" "index.html")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - НЕ НАЙДЕН"
        exit 1
    fi
done
echo ""

# Проверяем порты (используем 8082 вместо 8080)
echo "🔌 Проверка портов..."
PORTS=(8082 3001 8081)
for port in "${PORTS[@]}"; do
    if node -e "const net = require('net'); const server = net.createServer(); server.once('error', () => console.log('$port занят')); server.once('listening', () => { console.log('$port свободен'); server.close(); }); server.listen($port);" 2>/dev/null | grep -q "свободен"; then
        echo "   ✅ Порт $port свободен"
    else
        echo "   ⚠️  Порт $port занят"
    fi
done
echo ""

# Останавливаем предыдущие процессы
echo "🛑 Остановка предыдущих процессов..."
pkill -f "simple-http-server.js" 2>/dev/null
pkill -f "simple-auth-no-deps.js" 2>/dev/null
pkill -f "websocket-server.js" 2>/dev/null
sleep 2

# Запускаем Auth Server
echo "▶️  Запуск Auth Server (порт 3001)..."
node simple-auth-no-deps.js > auth-server.log 2>&1 &
AUTH_PID=$!
sleep 3

# Проверяем запуск Auth Server
if ps -p $AUTH_PID > /dev/null; then
    echo "   ✅ Auth Server запущен (PID: $AUTH_PID)"
else
    echo "   ❌ Ошибка запуска Auth Server"
    echo "   Проверьте логи: cat auth-server.log"
    exit 1
fi

# Запускаем WebSocket Server
echo "▶️  Запуск WebSocket Server (порт 8081)..."
node websocket-server.js > websocket-server.log 2>&1 &
WS_PID=$!
sleep 3

# Проверяем запуск WebSocket Server
if ps -p $WS_PID > /dev/null; then
    echo "   ✅ WebSocket Server запущен (PID: $WS_PID)"
else
    echo "   ❌ Ошибка запуска WebSocket Server"
    echo "   Проверьте логи: cat websocket-server.log"
    kill $AUTH_PID 2>/dev/null
    exit 1
fi

# Запускаем HTTP Server (на порту 8082)
echo "▶️  Запуск HTTP Server (порт 8082)..."
node simple-http-server.js > http-server.log 2>&1 &
HTTP_PID=$!
sleep 3

# Проверяем запуск HTTP Server
if ps -p $HTTP_PID > /dev/null; then
    echo "   ✅ HTTP Server запущен (PID: $HTTP_PID)"
else
    echo "   ❌ Ошибка запуска HTTP Server"
    echo "   Проверьте логи: cat http-server.log"
    kill $AUTH_PID $WS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Контрольный центр Атласа успешно запущен!"
echo ""
echo "📊 Статус компонентов:"
echo "   🔐 Auth API:      http://localhost:3001/api"
echo "   🔌 WebSocket:     ws://localhost:8081"
echo "   🌐 Frontend:      http://localhost:8082"
echo ""
echo "👤 Данные для входа по умолчанию:"
echo "   Имя пользователя: admin"
echo "   Пароль:           Admin123!"
echo ""
echo "⚠️  ВАЖНО: Смените пароль администратора после первого входа!"
echo ""
echo "📋 Для остановки выполните:"
echo "   pkill -f \"simple-http-server.js\""
echo "   pkill -f \"simple-auth-no-deps.js\""
echo "   pkill -f \"websocket-server.js\""
echo ""
echo "📁 Логи:"
echo "   auth-server.log, websocket-server.log, http-server.log"
echo ""
echo "🔄 Контрольный центр будет автоматически обновлять индекс памяти"
echo "   каждые 15 минут для актуальности данных."