# 🚀 Быстрый старт OpenClaw Dashboard

## 📋 Предварительные требования

- **Node.js** 18+ (`node --version`)
- **Git** (`git --version`)
- **OpenClaw** установлен и настроен

## ⚡ Установка за 3 минуты

### 1. Клонирование и настройка
```bash
# Перейти в рабочую область OpenClaw
cd /Users/rustammitaev/.openclaw/workspace

# Клонировать проект (если еще не склонирован)
git clone https://github.com/rustamkvk/openclaw.ru.git
cd openclaw.ru

# Или если проект уже создан локально
cd openclaw.ru
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Запуск в режиме разработки
```bash
# Запустить фронтенд (Next.js) и бэкенд (Express)
npm run dev:full

# Или по отдельности:
# npm run dev      # Фронтенд на http://localhost:3000
# npm run server   # Бэкенд на http://localhost:3001
```

### 4. Открыть в браузере
- **Дашборд:** http://localhost:3000
- **API:** http://localhost:3001/api/health

## 🔧 Настройка GitHub репозитория

### Если репозиторий еще не создан:
```bash
# Авторизоваться в GitHub CLI
gh auth login

# Создать репозиторий и отправить код
./scripts/setup-repo.sh

# Или вручную:
# 1. Создать на https://github.com/new
# 2. Выполнить:
git remote add origin https://github.com/rustamkvk/openclaw.ru.git
git push -u origin main
```

## 📁 Структура проекта

```
openclaw.ru/
├── src/                    # Frontend (Next.js)
│   ├── app/               # App Router страницы
│   ├── components/        # React компоненты
│   └── ...
├── server/                # Backend (Express API)
├── public/                # Статические файлы
├── scripts/               # Вспомогательные скрипты
└── docs/                  # Документация
```

## 🔌 Интеграция с OpenClaw

Дашборд автоматически подключается к:
- **Рабочей области OpenClaw** (`~/.openclaw/workspace`)
- **OpenClaw CLI** для выполнения команд
- **Файлам памяти** (MEMORY.md, daily notes)

## 🎯 Основные функции

### ✅ Реализовано:
- Контрольный центр с статистикой
- Просмотр активных сессий
- Чтение памяти OpenClaw
- Базовый API для интеграции

### 🚧 В разработке:
- Управление задачами 44-ФЗ
- Мониторинг субагентов
- Редактирование памяти
- Уведомления в реальном времени

## 🐛 Отладка

### Проверка подключения:
```bash
# Проверить API
curl http://localhost:3001/api/health

# Проверить OpenClaw
openclaw status

# Проверить git
git remote -v
```

### Частые проблемы:

1. **Ошибка портов:**
   ```bash
   # Проверить занятые порты
   lsof -i :3000
   lsof -i :3001
   
   # Изменить порты в .env.local
   PORT=3002
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```

2. **Ошибка доступа к OpenClaw:**
   ```bash
   # Проверить права
   ls -la ~/.openclaw/workspace/
   
   # Проверить конфигурацию
   openclaw config list
   ```

3. **Ошибки зависимостей:**
   ```bash
   # Очистить кэш и переустановить
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📈 Дальнейшие шаги

### Для разработки:
1. Изучите `src/components/` для примеров компонентов
2. Добавьте новые API endpoints в `server/index.js`
3. Настройте TypeScript типы в `src/types/`

### Для деплоя:
1. Соберите проект: `npm run build`
2. Настройте хостинг (Vercel/Netlify/Railway)
3. Настройте переменные окружения

### Для совместной работы:
1. Создайте ветку: `git checkout -b feature/name`
2. Регулярно коммитьте изменения
3. Создавайте Pull Requests на GitHub

## 📞 Поддержка

- **Документация OpenClaw:** https://docs.openclaw.ai
- **Сообщество Discord:** https://discord.com/invite/clawd
- **Issues на GitHub:** https://github.com/rustamkvk/openclaw.ru/issues

---

**Статус:** 🟢 Проект готов к разработке  
**Версия:** 0.1.0  
**Последнее обновление:** $(date +%Y-%m-%d)