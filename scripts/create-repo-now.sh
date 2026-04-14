#!/bin/bash

# Скрипт для немедленного создания GitHub репозитория

set -e

echo "🚀 Создание GitHub репозитория для OpenClaw Dashboard"
echo "======================================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка авторизации GitHub CLI
echo -e "${GREEN}🔐 Проверка авторизации GitHub CLI...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI не авторизован${NC}"
    echo ""
    echo "Для авторизации выполните:"
    echo "1. Откройте https://github.com/login/device"
    echo "2. Введите код: 3822-4DD7"
    echo "3. Затем запустите этот скрипт снова"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI авторизован${NC}"

# Переход в папку проекта
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
echo -e "${GREEN}📁 Рабочая директория:${NC} $PROJECT_DIR"

# Проверка существования репозитория
if git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}⚠️  Удаленный репозиторий уже настроен:${NC}"
    git remote -v
    echo ""
    echo "Хотите перезаписать? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Отмена."
        exit 0
    fi
    git remote remove origin
fi

# Создание репозитория
echo -e "${GREEN}🚀 Создание репозитория на GitHub...${NC}"
echo "Название: openclaw.ru"
echo "Описание: Dashboard for OpenClaw management and monitoring"
echo "Видимость: Public"

gh repo create rustamkvk/openclaw.ru \
    --public \
    --description "Dashboard for OpenClaw management and monitoring" \
    --source=. \
    --remote=origin \
    --push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Репозиторий успешно создан!${NC}"
    echo ""
    echo -e "${GREEN}🔗 Ссылка на репозиторий:${NC}"
    echo "https://github.com/rustamkvk/openclaw.ru"
    echo ""
    echo -e "${GREEN}📊 Статистика:${NC}"
    echo "Файлов отправлено: $(git ls-files | wc -l)"
    echo "Коммитов: $(git rev-list --count HEAD)"
    echo "Размер: $(du -sh . | cut -f1)"
    echo ""
    echo -e "${GREEN}🎉 Готово! Репозиторий создан и код отправлен.${NC}"
    echo "Можно начинать разработку с Cursor на другом компьютере."
else
    echo -e "${RED}❌ Ошибка при создании репозитория${NC}"
    echo ""
    echo "Альтернативный способ:"
    echo "1. Создайте репозиторий вручную: https://github.com/new"
    echo "2. Затем выполните команды:"
    echo "   git remote add origin https://github.com/rustamkvk/openclaw.ru.git"
    echo "   git push -u origin main"
    exit 1
fi