#!/bin/bash

# Запуск Контрольного центра без зависимостей

echo "🚀 Запуск Контрольного центра Атласа (без зависимостей)"
echo "========================================================"
echo ""

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "📁 Рабочая директория: $(pwd)"
echo ""

# Останавливаем предыдущие процессы
echo "🛑 Остановка предыдущих процессов..."
pkill -f "simple-http-server.js" 2>/dev/null
pkill -f "simple-auth-no-deps.js" 2>/dev/null
pkill -f "websocket-server.js" 2>/dev/null
sleep 2
echo ""

# Запускаем Auth Server (без зависимостей)
echo "▶️  Запуск Auth Server (порт 3001, без зависимостей)..."
node simple-auth-no-deps.js > auth-server.log 2>&1 &
AUTH_PID=$!
sleep 3

if ps -p $AUTH_PID > /dev/null 2>&1; then
    echo "   ✅ Auth Server запущен (PID: $AUTH_PID)"
else
    echo "   ❌ Ошибка запуска Auth Server"
    echo "   Проверьте логи:"
    tail -5 auth-server.log
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
    echo "   Проверьте логи:"
    tail -5 websocket-server.log
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
    echo "   Проверьте логи:"
    tail -5 http-server.log
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

# Проверяем доступность
echo "🔍 Проверка доступности..."
sleep 2
echo ""

# Проверяем HTTP сервер
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ HTTP сервер доступен: http://localhost:8080"
else
    echo "❌ HTTP сервер недоступен"
fi

# Проверяем API сервер
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API сервер доступен: http://localhost:3001/api/health"
else
    echo "❌ API сервер недоступен"
fi

echo ""
echo "⏳ Ожидание команд (Ctrl+C для остановки)..."
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
wait