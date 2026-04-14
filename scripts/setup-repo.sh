#!/bin/bash

# Скрипт автоматической настройки GitHub репозитория

set -e

echo "🔧 Настройка GitHub репозитория для OpenClaw Dashboard"
echo "======================================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка наличия git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git не установлен${NC}"
    echo "Установите git: brew install git"
    exit 1
fi

# Проверка наличия gh
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) не установлен${NC}"
    echo "Установите gh: brew install gh"
    echo "Или создайте репозиторий через веб-интерфейс"
fi

# Переход в папку проекта
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
echo -e "${GREEN}📁 Рабочая директория:${NC} $PROJECT_DIR"

# Проверка git конфигурации
echo -e "\n${GREEN}📊 Проверка конфигурации Git:${NC}"
git config --global user.name || echo -e "${YELLOW}⚠️  Имя пользователя не настроено${NC}"
git config --global user.email || echo -e "${YELLOW}⚠️  Email не настроен${NC}"

# Проверка существования репозитория
if git remote get-url origin &> /dev/null; then
    echo -e "\n${GREEN}✅ Удаленный репозиторий уже настроен:${NC}"
    git remote -v
else
    echo -e "\n${YELLOW}⚠️  Удаленный репозиторий не настроен${NC}"
    
    # Проверка авторизации gh
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        echo -e "${GREEN}✅ GitHub CLI авторизован${NC}"
        
        # Создание репозитория через gh
        echo -e "\n${GREEN}🚀 Создание репозитория через GitHub CLI...${NC}"
        gh repo create rustamkvk/openclaw.ru \
            --public \
            --description "Dashboard for OpenClaw management and monitoring" \
            --source=. \
            --remote=origin \
            --push
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Репозиторий создан и код отправлен!${NC}"
            echo -e "${GREEN}🔗 Ссылка:${NC} https://github.com/rustamkvk/openclaw.ru"
        else
            echo -e "${RED}❌ Ошибка при создании репозитория${NC}"
            echo "Создайте репозиторий вручную: https://github.com/new"
        fi
    else
        echo -e "${YELLOW}📝 Инструкция для ручного создания:${NC}"
        echo "1. Откройте https://github.com/new"
        echo "2. Создайте репозиторий 'openclaw.ru'"
        echo "3. Затем выполните команды:"
        echo ""
        echo "   git remote add origin https://github.com/rustamkvk/openclaw.ru.git"
        echo "   git push -u origin main"
        echo ""
        echo "Или авторизуйтесь в GitHub CLI:"
        echo "   gh auth login"
    fi
fi

# Проверка статуса
echo -e "\n${GREEN}📋 Статус проекта:${NC}"
echo "Файлов в репозитории: $(git ls-files | wc -l)"
echo "Последний коммит: $(git log -1 --oneline --pretty=format:"%h %s" 2>/dev/null || echo "Нет коммитов")"

# Проверка зависимостей
echo -e "\n${GREEN}📦 Проверка зависимостей:${NC}"
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo "✅ Зависимости установлены"
    else
        echo -e "${YELLOW}⚠️  Зависимости не установлены${NC}"
        echo "Установите: npm install"
    fi
else
    echo "❌ package.json не найден"
fi

echo -e "\n${GREEN}✅ Настройка завершена!${NC}"
echo "Следующие шаги:"
echo "1. Установите зависимости: npm install"
echo "2. Запустите проект: npm run dev"
echo "3. Откройте http://localhost:3000"