#!/usr/bin/env node

// Простейший HTTP сервер для тестирования

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
    console.log(`Запрос: ${req.method} ${req.url}`);
    
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Ошибка чтения файла:', err);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Ошибка сервера</h1>');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            }
        });
    } else if (req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Тестовая страница</h1><p>Сервер работает!</p>');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Страница не найдена</h1>');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Тестовый HTTP сервер запущен на порту ${PORT}`);
    console.log(`🌐 Откройте: http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Ошибка сервера:', err.message);
});