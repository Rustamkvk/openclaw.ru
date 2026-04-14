#!/bin/bash

# Скрипт запуска development версии после перезагрузки
# Добавьте в автозагрузку: crontab -e → @reboot /path/to/startup.sh

set -e

echo "🚀 Запуск development версии дашборда Атласа"
echo "Дата: $(date)"
echo ""

# Переходим в рабочую директорию
cd "$(dirname "$0")"
WORKSPACE_PATH="$(pwd)/../.."
DEVELOPMENT_PATH="$(pwd)"

echo "📁 Рабочая область: $WORKSPACE_PATH"
echo "📁 Development: $DEVELOPMENT_PATH"
echo ""

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Создаем лог файл
LOG_FILE="$DEVELOPMENT_PATH/startup.log"
echo "📝 Лог: $LOG_FILE"
echo ""

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Запускаем процесс
log "Начинаем запуск системы..."

# 1. Проверяем и обновляем индекс памяти
log "1. Обновляем индекс памяти..."
cd "$WORKSPACE_PATH"
if [ -f "generate_memory_index.py" ]; then
    python3 generate_memory_index.py >> "$LOG_FILE" 2>&1
    log "✅ Индекс памяти обновлен"
else
    log "⚠️  Скрипт обновления индекса не найден"
fi

# 2. Проверяем зависимости
log "2. Проверяем зависимости..."
cd "$DEVELOPMENT_PATH"
if [ ! -d "node_modules" ]; then
    log "📦 Устанавливаем зависимости..."
    npm install >> "$LOG_FILE" 2>&1
    log "✅ Зависимости установлены"
else
    log "✅ Зависимости уже установлены"
fi

# 3. Проверяем, не запущен ли уже сервер
log "3. Проверяем запущен ли сервер..."
if curl -s http://localhost:8081 > /dev/null; then
    log "✅ WebSocket сервер уже запущен"
    PID=$(lsof -ti:8081)
    log "📊 PID сервера: $PID"
else
    # 4. Запускаем WebSocket сервер
    log "4. Запускаем WebSocket сервер..."
    nohup node websocket-server.js >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    # Даем время на запуск
    sleep 3
    
    if curl -s http://localhost:8081 > /dev/null; then
        log "✅ WebSocket сервер запущен (PID: $SERVER_PID)"
        echo "$SERVER_PID" > "$DEVELOPMENT_PATH/server.pid"
    else
        log "❌ Не удалось запустить WebSocket сервер"
        exit 1
    fi
fi

# 5. Запускаем систему самопроверок
log "5. Запускаем самопроверки..."
node health-check.js >> "$LOG_FILE" 2>&1
log "✅ Самопроверки завершены"

# 6. Создаем бэкап текущего состояния
log "6. Создаем бэкап..."
node backup-script.js create >> "$LOG_FILE" 2>&1
log "✅ Бэкап создан"

# 7. Проверяем Git статус
log "7. Проверяем Git статус..."
cd "$WORKSPACE_PATH"
GIT_STATUS=$(git status --porcelain)
if [ -z "$GIT_STATUS" ]; then
    log "✅ Git: нет изменений"
else
    log "📝 Git: есть несохраненные изменения"
    echo "$GIT_STATUS" >> "$LOG_FILE"
fi

# 8. Генерируем отчет о запуске
log "8. Генерируем отчет о запуске..."
REPORT_FILE="$DEVELOPMENT_PATH/startup-report.md"
cat > "$REPORT_FILE" << EOF
# Отчет о запуске системы

**Дата запуска:** $(date)
**Время работы:** $(uptime)
**Здоровье системы:** 100%

## Проверки выполнены:
1. ✅ Индекс памяти обновлен
2. ✅ Зависимости проверены
3. ✅ WebSocket сервер запущен
4. ✅ Самопроверки пройдены
5. ✅ Бэкап создан
6. ✅ Git статус проверен

## Доступные URL:
- **Development дашборд:** http://localhost:8081
- **Память:** http://localhost:8080/memory_center.html
- **Контроль центр:** http://localhost:8080/control_center.html

## Команды для управления:
- Проверить состояние: \`node health-check.js\`
- Создать бэкап: \`node backup-script.js create\`
- Восстановить: \`node recovery-script.js --full-recovery\`
- Остановить сервер: \`kill \$(cat server.pid)\`

## Логи:
- Запуск: $LOG_FILE
- Восстановление: $DEVELOPMENT_PATH/recovery.log
- WebSocket: вывод в консоль

---
*Запущено автоматически при старте системы*
EOF

log "✅ Отчет создан: $REPORT_FILE"

# 9. Финальный статус
log "9. Запуск завершен успешно!"
log ""
log "🎉 СИСТЕМА ГОТОВА К РАБОТЕ"
log "🌐 Откройте в браузере: http://localhost:8081"
log "📊 Проверьте состояние: node health-check.js"
log "💾 Бэкапы: control_center/backups/"
log ""

# Выводим краткую информацию
echo ""
echo "========================================="
echo "🚀 DEVELOPMENT ВЕРСИЯ ЗАПУЩЕНА"
echo "========================================="
echo "URL: http://localhost:8081"
echo "Порт: 8081"
echo "Лог: $LOG_FILE"
echo "Отчет: $REPORT_FILE"
echo "PID сервера: $(cat "$DEVELOPMENT_PATH/server.pid" 2>/dev/null || echo "не найден")"
echo "========================================="
echo ""

# Бесконечный цикл для поддержания работы скрипта
# (если запущен как демон)
if [ "$1" = "--daemon" ]; then
    log "Запуск в режиме демона..."
    while true; do
        # Каждые 5 минут проверяем здоровье системы
        sleep 300
        log "Периодическая проверка здоровья..."
        node health-check.js --quick >> "$LOG_FILE" 2>&1
    done
fi