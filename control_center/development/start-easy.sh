#!/bin/bash

# Простой скрипт запуска Контрольного центра Атласа

echo "🚀 Запуск Контрольного центра Атласа (упрощенная версия)"
echo "========================================================"
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
REQUIRED_FILES=("simple-http-server.js" "simple-auth-server.js" "websocket-server.js" "index.html")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - НЕ НАЙДЕН"
        exit 1
    fi
done
echo ""

# Проверяем порты
echo "🔌 Проверка портов..."
PORTS=(8080 3001 8081)
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
pkill -f "simple-auth-server.js" 2>/dev/null
pkill -f "websocket-server.js" 2>/dev/null
sleep 2
echo ""

# Запускаем Auth Server
echo "▶️  Запуск Auth Server (порт 3001)..."
node simple-auth-server.js > auth-server.log 2>&1 &
AUTH_PID=$!
sleep 3

if ps -p $AUTH_PID > /dev/null 2>&1; then
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
sleep 2

if ps -p $WS_PID > /dev/null 2>&1; then
    echo "   ✅ WebSocket Server запущен (PID: $WS_PID)"
else
    echo "   ❌ Ошибка запуска WebSocket Server"
    echo "   Проверьте логи: cat websocket-server.log"
    kill $AUTH_PID 2>/dev/null
    exit 1
fi

# Запускаем HTTP Server
echo "▶️  Запуск HTTP Server (порт 8080)..."
node simple-http-server.js > http-server.log 2>&1 &
HTTP_PID=$!
sleep 3

if ps -p $HTTP_PID > /dev/null 2>&1; then
    echo "   ✅ HTTP Server запущен (PID: $HTTP_PID)"
else
    echo "   ❌ Ошибка запуска HTTP Server"
    echo "   Проверьте логи: cat http-server.log"
    kill $AUTH_PID $WS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Контрольный центр успешно запущен!"
echo "====================================="
echo ""
echo "🌐 ДОСТУПНЫЕ ССЫЛКИ:"
echo "   📍 Главный интерфейс:  http://localhost:8080"
echo "   🔐 API авторизации:    http://localhost:3001"
echo "   🔌 WebSocket чат:      ws://localhost:8081"
echo ""
echo "👤 ДАННЫЕ ДЛЯ ВХОДА:"
echo "   👤 Логин:    admin"
echo "   🔑 Пароль:   Admin123!"
echo ""
echo "⚠️  ВАЖНО:"
echo "   1. Смените пароль администратора после первого входа"
echo "   2. Для остановки нажмите Ctrl+C в этом окне"
echo "   3. Логи сохраняются в *.log файлах"
echo ""
echo "📊 ПРОВЕРКА СТАТУСА:"
echo "   curl http://localhost:8080"
echo "   curl http://localhost:3001/api/health"
echo ""
echo "📁 ЛОГИ:"
echo "   tail -f http-server.log"
echo "   tail -f auth-server.log"
echo "   tail -f websocket-server.log"
echo ""

# Функция для остановки
stop_servers() {
    echo ""
    echo "🛑 Остановка серверов..."
    kill $HTTP_PID $AUTH_PID $WS_PID 2>/dev/null
    echo "✅ Все серверы остановлены"
    exit 0
}

# Перехватываем Ctrl+C
trap stop_servers SIGINT

# Ждем
echo "⏳ Ожидание команд (Ctrl+C для остановки)..."
echo ""
wait