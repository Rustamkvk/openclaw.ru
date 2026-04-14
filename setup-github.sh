#!/bin/bash

# Скрипт настройки GitHub репозитория для OpenClaw Dashboard

echo "🚀 Настройка GitHub репозитория для OpenClaw Dashboard"
echo "======================================================"

# Проверка наличия git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен. Установите git: brew install git"
    exit 1
fi

# Проверка конфигурации git
echo "📊 Проверка конфигурации Git..."
git config --global user.name
git config --global user.email

echo ""
echo "📝 Инструкция по созданию репозитория на GitHub:"
echo "------------------------------------------------"
echo "1. Откройте https://github.com/new"
echo "2. Заполните поля:"
echo "   - Repository name: openclaw.ru"
echo "   - Description: Dashboard for OpenClaw management and monitoring"
echo "   - Visibility: Public (или Private по желанию)"
echo "   - НЕ добавляйте README, .gitignore или license (мы уже создали)"
echo "3. Нажмите 'Create repository'"
echo ""
echo "4. После создания, выполните команды ниже:"
echo ""
echo "   # Добавить удаленный репозиторий"
echo "   git remote add origin https://github.com/rustamkvk/openclaw.ru.git"
echo ""
echo "   # Отправить код на GitHub"
echo "   git push -u origin main"
echo ""
echo "5. Для настройки GitHub токена (опционально):"
echo "   - Откройте https://github.com/settings/tokens"
echo "   - Нажмите 'Generate new token'"
echo "   - Выберите scopes: repo, workflow"
echo "   - Сохраните токен в ~/.github_token"
echo "   chmod 600 ~/.github_token"

echo ""
echo "🔧 Текущий статус проекта:"
echo "-------------------------"
echo "Файлов в репозитории: $(git ls-files | wc -l)"
echo "Последний коммит: $(git log -1 --oneline)"
echo "Путь к проекту: $(pwd)"

echo ""
echo "✅ Готово! Следуйте инструкциям выше для завершения настройки."