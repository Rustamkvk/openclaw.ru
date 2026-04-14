#!/bin/bash

# Финальная версия запуска Контрольного центра

echo "🚀 ЗАПУСК КОНТРОЛЬНОГО ЦЕНТРА АТЛАСА"
echo "====================================="
echo ""

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "📁 Директория: $(pwd)"
echo ""

# Останавливаем предыдущие процессы
echo "🛑 Остановка предыдущих процессов..."
pkill -f "test-http-server.js" 2>/dev/null
pkill -f "simple-auth-no-deps.js" 2>/dev/null
pkill -f "websocket-server.js" 2>/dev/null
sleep 2
echo ""

# Запускаем Auth Server
echo "▶️  Запуск Auth Server (порт 3001)..."
node simple-auth-no-deps.js > auth.log 2>&1 &
AUTH_PID=$!
sleep 3

if ps -p $AUTH_PID > /dev/null 2>&1; then
    echo "   ✅ Auth Server запущен (PID: $AUTH_PID)"
    echo "   🔗 API: http://localhost:3001/api"
else
    echo "   ❌ Ошибка запуска Auth Server"
    tail -5 auth.log
    exit 1
fi

# Запускаем WebSocket Server
echo "▶️  Запуск WebSocket Server (порт 8081)..."
node websocket-server.js > websocket.log 2>&1 &
WS_PID=$!
sleep 2

if ps -p $WS_PID > /dev/null 2>&1; then
    echo "   ✅ WebSocket Server запущен (PID: $WS_PID)"
    echo "   🔗 WebSocket: ws://localhost:8081"
else
    echo "   ❌ Ошибка запуска WebSocket Server"
    tail -5 websocket.log
    kill $AUTH_PID 2>/dev/null
    exit 1
fi

# Запускаем HTTP Server (тестовый)
echo "▶️  Запуск HTTP Server (порт 8080)..."
node test-http-server.js > http.log 2>&1 &
HTTP_PID=$!
sleep 3

if ps -p $HTTP_PID > /dev/null 2>&1; then
    echo "   ✅ HTTP Server запущен (PID: $HTTP_PID)"
    echo "   🌐 Интерфейс: http://localhost:8080"
else
    echo "   ❌ Ошибка запуска HTTP Server"
    tail -5 http.log
    kill $AUTH_PID $WS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 СИСТЕМА УСПЕШНО ЗАПУЩЕНА!"
echo "============================="
echo ""
echo "🌐 ССЫЛКИ ДЛЯ ДОСТУПА:"
echo ""
echo "   1. 📍 ГЛАВНЫЙ ИНТЕРФЕЙС:"
echo "      http://localhost:8080"
echo ""
echo "   2. 🔐 API АВТОРИЗАЦИИ:"
echo "      http://localhost:3001/api"
echo "      • /api/register - Регистрация"
echo "      • /api/login    - Вход"
echo "      • /api/logout   - Выход"
echo "      • /api/profile  - Профиль"
echo "      • /api/health   - Проверка"
echo ""
echo "   3. 🔌 WEBSOCKET ЧАТ:"
echo "      ws://localhost:8081"
echo ""
echo "👤 ДАННЫЕ ДЛЯ ВХОДА:"
echo ""
echo "   👤 Логин:    admin"
echo "   🔑 Пароль:   Admin123!"
echo ""
echo "⚠️  ВАЖНЫЕ КОМАНДЫ:"
echo ""
echo "   • Проверить статус:"
echo "     curl http://localhost:8080"
echo "     curl http://localhost:3001/api/health"
echo ""
echo "   • Просмотреть логи:"
echo "     tail -f http.log"
echo "     tail -f auth.log"
echo "     tail -f websocket.log"
echo ""
echo "   • Остановить систему:"
echo "     Нажмите Ctrl+C в этом окне"
echo ""

# Проверяем доступность
echo "🔍 ПРОВЕРКА ДОСТУПНОСТИ..."
echo ""

sleep 2

# Проверяем HTTP сервер
echo -n "   HTTP сервер (8080): "
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ ДОСТУПЕН"
else
    echo "❌ НЕ ДОСТУПЕН"
fi

# Проверяем API сервер
echo -n "   API сервер (3001):  "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ ДОСТУПЕН"
else
    echo "❌ НЕ ДОСТУПЕН"
fi

echo ""
echo "====================================="
echo "🚀 СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!"
echo ""
echo "💡 Откройте браузер и перейдите по ссылке:"
echo "   http://localhost:8080"
echo ""
echo "⏳ Ожидание команд (Ctrl+C для остановки)..."
echo ""

# Функция остановки
stop_all() {
    echo ""
    echo "🛑 Остановка системы..."
    kill $HTTP_PID $AUTH_PID $WS_PID 2>/dev/null
    echo "✅ Все серверы остановлены"
    exit 0
}

trap stop_all SIGINT

# Бесконечное ожидание
while true; do
    sleep 1
done