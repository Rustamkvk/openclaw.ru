#!/bin/bash

# Скрипт для проверки доступности Контрольного центра через интернет

echo "🌐 Проверка доступности Контрольного центра через интернет"
echo "=========================================================="
echo ""

# Получаем внешний IP
echo "🔍 Определение внешнего IP адреса..."
EXTERNAL_IP=$(curl -s ifconfig.me)
if [ -z "$EXTERNAL_IP" ]; then
    EXTERNAL_IP=$(curl -s ipinfo.io/ip)
fi

echo "✅ Ваш внешний IP: $EXTERNAL_IP"
echo ""

# Получаем внутренний IP
echo "🔍 Определение внутреннего IP адреса..."
INTERNAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -z "$INTERNAL_IP" ]; then
    INTERNAL_IP="не определен"
fi

echo "✅ Ваш внутренний IP: $INTERNAL_IP"
echo ""

# Проверяем запущенные сервисы
echo "🔍 Проверка запущенных сервисов Контрольного центра..."
echo ""

PORTS=("8080" "3001" "8081")
SERVICES=("Главный интерфейс" "API авторизации" "WebSocket чат")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    SERVICE=${SERVICES[$i]}
    
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "✅ $SERVICE (порт $PORT) - ЗАПУЩЕН"
        
        # Проверяем локальный доступ
        if curl -s http://localhost:$PORT > /dev/null 2>&1; then
            echo "   📍 Локальный доступ: http://localhost:$PORT"
        else
            echo "   ⚠️  Локальный доступ: НЕ ДОСТУПЕН"
        fi
        
        # Проверяем доступ из интернета (только для главного интерфейса)
        if [ "$PORT" = "8080" ]; then
            echo "   🌐 Внешний доступ: http://$EXTERNAL_IP:$PORT"
            echo "   📡 Проверка доступности из интернета..."
            
            # Имитируем проверку извне (ограниченная проверка)
            echo "   ℹ️  Для полной проверки откройте в браузере:"
            echo "      http://$EXTERNAL_IP:$PORT"
        fi
        
    else
        echo "❌ $SERVICE (порт $PORT) - НЕ ЗАПУЩЕН"
    fi
    echo ""
done

# Проверка брандмауэра
echo "🔒 Проверка настроек брандмауэра..."
echo ""

# macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🖥️  macOS обнаружен"
    PF_STATUS=$(sudo pfctl -s info 2>/dev/null | grep "Status" || echo "Не удалось проверить")
    echo "   Статус pf: $PF_STATUS"
    
    # Проверяем правила
    echo "   📋 Текущие правила брандмауэра:"
    sudo pfctl -s rules 2>/dev/null | grep -E "(pass|block)" | head -5 || echo "   Не удалось получить правила"
    
# Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux обнаружен"
    
    # Проверяем ufw
    if command -v ufw > /dev/null 2>&1; then
        echo "   🔧 UFW найден"
        sudo ufw status | head -10
    else
        echo "   ℹ️  UFW не установлен"
    fi
fi

echo ""

# Инструкции по настройке доступа
echo "📋 ИНСТРУКЦИИ ПО НАСТРОЙКЕ ДОСТУПА ЧЕРЕЗ ИНТЕРНЕТ:"
echo "=================================================="
echo ""
echo "1. 🚀 ЗАПУСТИТЕ КОНТРОЛЬНЫЙ ЦЕНТР:"
echo "   cd ~/.openclaw/workspace/control_center/development"
echo "   ./check-and-run.sh"
echo ""
echo "2. 🔧 НАСТРОЙТЕ ПРОБРОС ПОРТОВ НА РОУТЕРЕ:"
echo "   - Зайдите в настройки роутера (обычно http://192.168.1.1)"
echo "   - Найдите 'Port Forwarding' или 'Виртуальные серверы'"
echo "   - Добавьте правило для порта 8080:"
echo "     Внешний порт: 8080 → Внутренний IP: $INTERNAL_IP → Внутренний порт: 8080"
echo ""
echo "3. 🌐 ОТКРОЙТЕ В БРАУЗЕРЕ:"
echo "   http://$EXTERNAL_IP:8080"
echo ""
echo "4. 🔑 ВОЙДИТЕ В СИСТЕМУ:"
echo "   Логин: admin"
echo "   Пароль: Admin123!"
echo ""
echo "5. 🔒 СМЕНИТЕ ПАРОЛЬ АДМИНИСТРАТОРА:"
echo "   После входа сразу смените пароль в настройках профиля"
echo ""
echo "6. 📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:"
echo "   - Полное руководство: INTERNET_ACCESS_GUIDE.md"
echo "   - Быстрый старт: QUICK_ACCESS_GUIDE.md"
echo ""

# Проверка доступности из интернета (опционально)
echo "🔍 ОПЦИОНАЛЬНО: Проверка доступности из интернета..."
echo "   Эта проверка требует, чтобы порт 8080 был открыт на роутере"
echo "   Нажмите Enter для проверки или Ctrl+C для отмены"
read -p "   Продолжить? [y/N]: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   ⏳ Проверяем доступность http://$EXTERNAL_IP:8080 ..."
    
    # Используем timeout для проверки
    if timeout 5 curl -s --head http://$EXTERNAL_IP:8080 > /dev/null 2>&1; then
        echo "   ✅ Контрольный центр доступен из интернета!"
        echo "   🌐 Откройте в браузере: http://$EXTERNAL_IP:8080"
    else
        echo "   ❌ Контрольный центр НЕ доступен из интернета"
        echo "   Возможные причины:"
        echo "   1. Порт 8080 не открыт на роутере"
        echo "   2. Брандмауэр блокирует входящие соединения"
        echo "   3. Провайдер блокирует входящие соединения"
        echo "   4. Контрольный центр не запущен"
    fi
fi

echo ""
echo "=========================================================="
echo "✅ Проверка завершена"
echo ""
echo "💡 СОВЕТ: Для безопасного доступа рекомендуется:"
echo "   1. Настроить домен и SSL (Let's Encrypt)"
echo "   2. Использовать Nginx как обратный прокси"
echo "   3. Настроить ограничение доступа по IP"
echo "   4. Регулярно обновлять пароли"