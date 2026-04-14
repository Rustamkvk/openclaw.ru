#!/usr/bin/env node

/**
 * Упрощенный Auth Server без зависимостей
 * Использует встроенные модули Node.js
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DB_DIR = path.join(__dirname, 'data');

// Создаем папку для базы данных, если её нет
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Файлы базы данных
const USERS_FILE = path.join(DB_DIR, 'users.json');
const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');
const LOGS_FILE = path.join(DB_DIR, 'logs.json');

// Инициализация базы данных
function initDatabase() {
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = {
            users: [
                {
                    id: '1',
                    username: 'admin',
                    password: hashPassword('Admin123!'),
                    email: 'admin@localhost',
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ]
        };
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        console.log('✅ Создан пользователь по умолчанию: admin / Admin123!');
    }
    
    if (!fs.existsSync(SESSIONS_FILE)) {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2));
    }
    
    if (!fs.existsSync(LOGS_FILE)) {
        fs.writeFileSync(LOGS_FILE, JSON.stringify({ logs: [] }, null, 2));
    }
}

// Хеширование пароля
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Генерация токена
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Логирование
function logAction(action, userId, ip, userAgent) {
    const logEntry = {
        id: Date.now().toString(),
        action,
        userId,
        ip,
        userAgent,
        timestamp: new Date().toISOString()
    };
    
    const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    logs.logs.push(logEntry);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// Чтение тела запроса
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

// Создаем HTTP сервер
const server = http.createServer(async (req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обработка OPTIONS запросов
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    try {
        // Маршруты API
        if (pathname === '/api/register' && req.method === 'POST') {
            await handleRegister(req, res);
        } else if (pathname === '/api/login' && req.method === 'POST') {
            await handleLogin(req, res);
        } else if (pathname === '/api/logout' && req.method === 'POST') {
            await handleLogout(req, res);
        } else if (pathname === '/api/profile' && req.method === 'GET') {
            await handleProfile(req, res);
        } else if (pathname === '/api/health' && req.method === 'GET') {
            handleHealth(req, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Маршрут не найден' }));
        }
    } catch (error) {
        console.error('❌ Ошибка обработки запроса:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
    }
});

// Регистрация
async function handleRegister(req, res) {
    const body = await readRequestBody(req);
    const { username, password, email } = body;
    
    if (!username || !password || !email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Все поля обязательны' }));
        return;
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    
    // Проверяем, существует ли пользователь
    if (users.users.find(u => u.username === username)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Пользователь уже существует' }));
        return;
    }
    
    // Создаем нового пользователя
    const newUser = {
        id: Date.now().toString(),
        username,
        password: hashPassword(password),
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    users.users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    
    // Логируем действие
    logAction('register', newUser.id, req.socket.remoteAddress, req.headers['user-agent']);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: 'Пользователь успешно зарегистрирован',
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        }
    }));
}

// Вход
async function handleLogin(req, res) {
    const body = await readRequestBody(req);
    const { username, password } = body;
    
    if (!username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Имя пользователя и пароль обязательны' }));
        return;
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.users.find(u => u.username === username);
    
    if (!user || user.password !== hashPassword(password)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Неверное имя пользователя или пароль' }));
        return;
    }
    
    // Создаем сессию
    const token = generateToken();
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    
    const session = {
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
    };
    
    sessions.sessions.push(session);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    
    // Логируем действие
    logAction('login', user.id, req.socket.remoteAddress, req.headers['user-agent']);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: 'Вход выполнен успешно',
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    }));
}

// Выход
async function handleLogout(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Требуется авторизация' }));
        return;
    }
    
    const token = authHeader.substring(7);
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    
    // Удаляем сессию
    const initialLength = sessions.sessions.length;
    sessions.sessions = sessions.sessions.filter(s => s.token !== token);
    
    if (sessions.sessions.length < initialLength) {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
        
        // Логируем действие
        logAction('logout', 'unknown', req.socket.remoteAddress, req.headers['user-agent']);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Выход выполнен успешно' }));
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Неверный токен' }));
    }
}

// Профиль
async function handleProfile(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Требуется авторизация' }));
        return;
    }
    
    const token = authHeader.substring(7);
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    const session = sessions.sessions.find(s => s.token === token);
    
    if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Неверный токен' }));
        return;
    }
    
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.users.find(u => u.id === session.userId);
    
    if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Пользователь не найден' }));
        return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        }
    }));
}

// Health check
function handleHealth(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Auth API',
        version: '1.0.0'
    }));
}

// Инициализируем базу данных
initDatabase();

// Запускаем сервер
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Auth Server запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
    console.log('📋 Доступные маршруты:');
    console.log('   POST /api/register - Регистрация');
    console.log('   POST /api/login    - Вход');
    console.log('   POST /api/logout   - Выход');
    console.log('   GET  /api/profile  - Профиль');
    console.log('   GET  /api/health   - Проверка здоровья');
    console.log('');
    console.log('👤 Пользователь по умолчанию:');
    console.log('   Логин:    admin');
    console.log('   Пароль:   Admin123!');
    console.log('');
    console.log('📁 База данных: data/');
    console.log('🛑 Для остановки нажмите Ctrl+C');
});

// Обработка ошибок
server.on('error', (err) => {
    console.error('❌ Ошибка Auth Server:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Порт ${PORT} уже занят`);
    }
});

// Обработка сигналов
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка Auth Server...');
    server.close(() => {
        console.log('✅ Auth Server остановлен');
        process.exit(0);
    });
});