#!/bin/bash

# Менеджер Контрольного центра Атласа

COMMAND="$1"

case "$COMMAND" in
    start)
        echo "🚀 Запуск Контрольного центра Атласа..."
        cd "$(dirname "$0")"
        ./start-final-fixed.sh
        ;;
    stop)
        echo "🛑 Остановка Контрольного центра Атласа..."
        pkill -f "simple-http-server-fixed.js" 2>/dev/null
        pkill -f "simple-auth-no-deps.js" 2>/dev/null
        pkill -f "websocket-server.js" 2>/dev/null
        echo "✅ Все компоненты остановлены"
        ;;
    status)
        echo "📊 Статус Контрольного центра Атласа:"
        echo ""
        
        # Проверяем процессы
        echo "🔍 Проверка процессов:"
        if pgrep -f "simple-auth-no-deps.js" > /dev/null; then
            echo "   ✅ Auth Server (порт 3001) - запущен"
        else
            echo "   ❌ Auth Server (порт 3001) - остановлен"
        fi
        
        if pgrep -f "websocket-server.js" > /dev/null; then
            echo "   ✅ WebSocket Server (порт 8081) - запущен"
        else
            echo "   ❌ WebSocket Server (порт 8081) - остановлен"
        fi
        
        if pgrep -f "simple-http-server-fixed.js" > /dev/null; then
            echo "   ✅ HTTP Server (порт 8082) - запущен"
        else
            echo "   ❌ HTTP Server (порт 8082) - остановлен"
        fi
        
        echo ""
        echo "🌐 Доступные URL:"
        echo "   🔐 Auth API:      http://localhost:3001/api"
        echo "   🔌 WebSocket:     ws://localhost:8081"
        echo "   🌐 Frontend:      http://localhost:8082"
        echo ""
        echo "👤 Данные для входа:"
        echo "   Имя пользователя: admin"
        echo "   Пароль:           Admin123!"
        ;;
    restart)
        echo "🔄 Перезапуск Контрольного центра Атласа..."
        cd "$(dirname "$0")"
        ./control-center-manager.sh stop
        sleep 2
        ./control-center-manager.sh start
        ;;
    logs)
        echo "📁 Логи Контрольного центра:"
        cd "$(dirname "$0")"
        echo ""
        echo "Auth Server:"
        tail -20 auth-server.log 2>/dev/null || echo "   Лог не найден"
        echo ""
        echo "WebSocket Server:"
        tail -20 websocket-server.log 2>/dev/null || echo "   Лог не найден"
        echo ""
        echo "HTTP Server:"
        tail -20 http-server.log 2>/dev/null || echo "   Лог не найден"
        ;;
    *)
        echo "📋 Использование: $0 {start|stop|status|restart|logs}"
        echo ""
        echo "Команды:"
        echo "  start    - Запустить Контрольный центр"
        echo "  stop     - Остановить Контрольный центр"
        echo "  status   - Показать статус компонентов"
        echo "  restart  - Перезапустить Контрольный центр"
        echo "  logs     - Показать логи"
        echo ""
        echo "🌐 После запуска откройте в браузере:"
        echo "   http://localhost:8082"
        echo ""
        echo "👤 Данные для входа по умолчанию:"
        echo "   Имя пользователя: admin"
        echo "   Пароль:           Admin123!"
        exit 1
        ;;
esac