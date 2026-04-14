# Настройка GitHub репозитория для OpenClaw Dashboard

## 🚀 Быстрая настройка (5 минут)

### Шаг 1: Создать репозиторий на GitHub
1. Откройте https://github.com/new
2. Заполните поля:
   - **Repository name:** `openclaw.ru`
   - **Description:** `Dashboard for OpenClaw management and monitoring`
   - **Visibility:** Public (рекомендуется) или Private
   - **НЕ добавляйте:** README, .gitignore, license (мы уже создали)
3. Нажмите **Create repository**

### Шаг 2: Настроить подключение в терминале
```bash
# Перейти в папку проекта
cd /Users/rustammitaev/.openclaw/workspace/openclaw.ru

# Добавить удаленный репозиторий
git remote add origin https://github.com/rustamkvk/openclaw.ru.git

# Отправить код на GitHub
git push -u origin main
```

### Шаг 3: Настроить GitHub CLI (опционально, для удобства)
```bash
# Авторизоваться
gh auth login

# Проверить статус
gh auth status

# Создать репозиторий через CLI (если не создали через веб)
gh repo create openclaw.ru --public --description "Dashboard for OpenClaw management and monitoring" --source=. --remote=origin --push
```

## 🔑 Настройка GitHub токена (для автоматизации)

### Создать токен:
1. Откройте https://github.com/settings/tokens
2. Нажмите **Generate new token (classic)**
3. Выберите scopes:
   - `repo` (полный доступ к репозиториям)
   - `workflow` (для GitHub Actions)
4. Сохраните токен (он покажется только один раз!)

### Сохранить токен локально:
```bash
# Сохранить токен в файл
echo "ghp_ваш_токен_здесь" > ~/.github_token
chmod 600 ~/.github_token

# Или добавить в переменные окружения
echo 'export GITHUB_TOKEN="ghp_ваш_токен_здесь"' >> ~/.zshrc
source ~/.zshrc
```

## 📁 Структура проекта (уже создана)

```
openclaw.ru/
├── src/                    # Исходный код
│   ├── app/               # Next.js App Router
│   ├── components/        # React компоненты
│   ├── pages/            # Страницы (резерв)
│   ├── services/         # API клиенты
│   ├── utils/            # Вспомогательные функции
│   └── types/            # TypeScript типы
├── public/               # Статические файлы
├── docs/                 # Документация
├── scripts/              # Вспомогательные скрипты
└── конфигурационные файлы
```

## 🛠️ Команды разработки

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev

# Сборка для production
npm run build

# Запуск production версии
npm start
```

## 🔗 Полезные ссылки

- **Репозиторий:** https://github.com/rustamkvk/openclaw.ru
- **Деплой:** Будет настроен позже (Vercel/Netlify)
- **Документация:** https://docs.openclaw.ai
- **Сообщество:** https://discord.com/invite/clawd

## 👥 Совместная работа с Cursor

1. **Клонировать репозиторий** на второй компьютер:
   ```bash
   git clone https://github.com/rustamkvk/openclaw.ru.git
   cd openclaw.ru
   ```

2. **Создать ветку** для новой фичи:
   ```bash
   git checkout -b feature/название-фичи
   ```

3. **Регулярно коммитить:**
   ```bash
   git add .
   git commit -m "feat: описание изменений"
   git push origin feature/название-фичи
   ```

4. **Создать Pull Request** через GitHub веб-интерфейс

## ✅ Проверка подключения

После настройки выполните:
```bash
cd /Users/rustammitaev/.openclaw/workspace/openclaw.ru
git remote -v  # Должны увидеть origin
git status     # Должен быть clean
```

## 🆘 Если возникли проблемы

1. **Ошибка аутентификации:**
   ```bash
   git config --global user.name "Rustamkvk"
   git config --global user.email "55462640+Rustamkvk@users.noreply.github.com"
   ```

2. **Ошибка доступа к репозиторию:**
   - Проверьте, что репозиторий существует
   - Проверьте права доступа (public/private)
   - Обновите URL: `git remote set-url origin https://github.com/rustamkvk/openclaw.ru.git`

3. **Конфликты при push:**
   ```bash
   git pull origin main --rebase
   git push origin main
   ```

---

**Статус:** ✅ Локальный проект создан, готов к отправке на GitHub  
**Следующий шаг:** Создать репозиторий через веб-интерфейс GitHub и выполнить `git push`