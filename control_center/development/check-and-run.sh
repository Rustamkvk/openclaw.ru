#!/bin/bash

# Скрипт для проверки и запуска Контрольного центра Атласа

echo "🔍 Проверка Контрольного центра Атласа..."
echo "=========================================="

# Проверяем рабочую директорию
WORKDIR="/Users/rustammitaev/.openclaw/workspace/control_center/development"
cd "$WORKDIR" || { echo "❌ Не могу перейти в $WORKDIR"; exit 1; }
echo "✅ Рабочая директория: $PWD"

# Проверяем необходимые файлы
echo ""
echo "📁 Проверка файлов:"
required_files=("index.html" "auth.js" "script.js" "simple-auth-server.js" "simple-db.js" "websocket-server.js" "start-simple.js")
missing_files=0

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - ОТСУТСТВУЕТ"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "⚠️  Отсутствуют $missing_files файлов. Продолжить? (y/n)"
    read -r continue
    if [ "$continue" != "y" ]; then
        echo "❌ Запуск отменен"
        exit 1
    fi
fi

# Проверяем папку data
echo ""
echo "💾 Проверка базы данных:"
if [ -d "data" ]; then
    echo "   ✅ Папка data существует"
    
    data_files=("users.json" "sessions.json" "logs.json" "settings.json")
    for file in "${data_files[@]}"; do
        if [ -f "data/$file" ]; then
            echo "   ✅ data/$file"
        else
            echo "   ⚠️  data/$file - будет создан при запуске"
        fi
    done
else
    echo "   ⚠️  Папка data будет создана при запуске"
fi

# Проверяем Node.js
echo ""
echo "🟢 Проверка Node.js:"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "   ✅ Node.js $node_version"
else
    echo "   ❌ Node.js не установлен"
    echo "   Установите Node.js с https://nodejs.org/"
    exit 1
fi

# Проверяем порты
echo ""
echo "🔌 Проверка портов:"
ports=(3001 8080 8081)
for port in "${ports[@]}"; do
    if lsof -i :$port &> /dev/null; then
        echo "   ⚠️  Порт $port занят"
        echo "   Хотите освободить порт? (y/n)"
        read -r free_port
        if [ "$free_port" = "y" ]; then
            echo "   Поиск процесса на порту $port..."
            pid=$(lsof -ti:$port)
            if [ -n "$pid" ]; then
                echo "   Останавливаю процесс $pid..."
                kill -9 "$pid"
                sleep 2
                if lsof -i :$port &> /dev/null; then
                    echo "   ❌ Не удалось освободить порт $port"
                else
                    echo "   ✅ Порт $port освобожден"
                fi
            fi
        fi
    else
        echo "   ✅ Порт $port свободен"
    fi
done

# Запуск системы
echo ""
echo "🚀 Запуск Контрольного центра Атласа..."
echo "=========================================="

# Запускаем систему
node start-simple.js

# Если скрипт завершился
echo ""
echo "🛑 Система остановлена"
echo ""
echo "📋 Что делать дальше:"
echo "1. Проверьте логи выше для диагностики"
echo "2. Убедитесь что все порты свободны"
echo "3. Проверьте наличие всех файлов"
echo "4. Попробуйте запустить компоненты по отдельности:"
echo "   - node simple-auth-server.js"
echo "   - node websocket-server.js"
echo "   - node -e '...код HTTP сервера...'"
echo ""
echo "📞 Для помощи обратитесь к документации в README-FINAL.md"