#!/usr/bin/env node

/**
 * Простой HTTP сервер для Контрольного центра Атласа
 * Обслуживает статические файлы и проксирует API запросы
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8082;
const API_URL = 'http://localhost:3001';
const STATIC_DIR = __dirname;

// MIME типы
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.md': 'text/markdown'
};

// Функция для проксирования API запросов
function proxyToAPI(req, res, apiPath) {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: apiPath,
        method: req.method,
        headers: { ...req.headers, host: 'localhost:3001' }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Ошибка проксирования API:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API сервер недоступен' }));
    });

    req.pipe(proxyReq);
}

// Функция для обслуживания статических файлов
function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Файл не найден
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 - Страница не найдена</h1>');
            } else {
                // Другая ошибка сервера
                console.error('❌ Ошибка чтения файла:', err.message);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>500 - Внутренняя ошибка сервера</h1>');
            }
        } else {
            // Файл найден
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // Разбираем URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Обработка API запросов
    if (pathname.startsWith('/api/')) {
        proxyToAPI(req, res, pathname);
        return;
    }
    
    // Определяем путь к файлу
    let filePath;
    if (pathname === '/') {
        filePath = path.join(STATIC_DIR, 'index.html');
    } else if (pathname.endsWith('/')) {
        // Если путь заканчивается на /, добавляем index.html
        filePath = path.join(STATIC_DIR, pathname, 'index.html');
    } else {
        filePath = path.join(STATIC_DIR, pathname);
    }
    
    // Проверяем существование файла
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Если файл не найден, пробуем index.html
            if (pathname !== '/') {
                filePath = path.join(STATIC_DIR, 'index.html');
            }
        }
        
        // Обслуживаем файл
        serveStaticFile(filePath, res);
    });
});

// Запускаем сервер
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP сервер запущен на порту ${PORT}`);
    console.log(`🌐 Локальный доступ: http://localhost:${PORT}`);
    console.log(`🌐 Сетевой доступ: http://${getLocalIP()}:${PORT}`);
    console.log(`🔗 API сервер: ${API_URL}`);
    console.log(`📁 Статические файлы из: ${STATIC_DIR}`);
    console.log('📋 Для остановки нажмите Ctrl+C');
});

// Функция для получения локального IP
function getLocalIP() {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Обработка ошибок
server.on('error', (err) => {
    console.error('❌ Ошибка HTTP сервера:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Порт ${PORT} уже занят`);
        console.log('   Проверьте: ps aux | grep "node.*${PORT}"');
        console.log('   Или убейте процесс: kill -9 [PID]');
    }
});

// Обработка сигналов
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка HTTP сервера...');
    server.close(() => {
        console.log('✅ HTTP сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM, остановка...');
    server.close(() => {
        console.log('✅ HTTP сервер остановлен');
        process.exit(0);
    });
});