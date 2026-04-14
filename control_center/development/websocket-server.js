// Простой WebSocket сервер для тестирования
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Конфигурация
const workspaceRoot = '/Users/rustammitaev/.openclaw/workspace';

// Создаем HTTP сервер для обслуживания статики и API
const server = http.createServer((req, res) => {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Обработка API запросов
  if (req.method === 'POST' && req.url === '/api/send-telegram') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const message = data.message;
        
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Сообщение обязательно' }));
          return;
        }
        
        // Отправка сообщения через OpenClaw
        const { exec } = require('child_process');
        const command = `openclaw message send --channel telegram --target 944221719 --message "${message.replace(/"/g, '\\"')}"`;
        
        exec(command, { cwd: workspaceRoot }, (error, stdout, stderr) => {
          if (error) {
            console.error('Ошибка отправки в Telegram:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка отправки сообщения' }));
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Сообщение отправлено в Telegram' }));
        });
      } catch (error) {
        console.error('Ошибка обработки API запроса:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
      }
    });
    
    return;
  }
  
  // Обслуживаем статические файлы
  let filePath;
  
  // Если запрос корневой, отдаём index.html из development
  if (req.url === '/') {
    filePath = path.join(__dirname, 'index.html');
  } else if (req.url.startsWith('/api/')) {
    // API маршруты, которые не обработаны выше
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API маршрут не найден' }));
    return;
  } else {
    // Сначала проверяем файлы в development папке
    const devPath = path.join(__dirname, req.url);
    if (fs.existsSync(devPath)) {
      filePath = devPath;
    } else {
      // Если нет в development, ищем в корне рабочей области
      filePath = path.join(workspaceRoot, req.url);
    }
  }
  
  // Защита от directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(workspaceRoot) && !normalizedPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access denied');
    return;
  }
  
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
  }
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Хранилище подключенных клиентов
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('Новое WebSocket подключение');
  clients.add(ws);
  
  // Отправляем приветственное сообщение
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Добро пожаловать в чат с Атласом!',
    timestamp: new Date().toISOString()
  }));
  
  // Обработка входящих сообщений
  ws.on('message', (message) => {
    console.log('Получено сообщение:', message.toString());
    
    try {
      const data = JSON.parse(message);
      
      // Эхо-ответ для тестирования
      const response = {
        type: 'message',
        sender: 'atlas',
        content: `Эхо: ${data.content}`,
        timestamp: new Date().toISOString(),
        original: data.content
      };
      
      ws.send(JSON.stringify(response));
      
      // Также отправляем всем подключенным клиентам
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'broadcast',
            sender: 'user',
            content: data.content,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Неверный формат сообщения',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Обработка отключения
  ws.on('close', () => {
    console.log('WebSocket отключен');
    clients.delete(ws);
  });
  
  // Обработка ошибок
  ws.on('error', (error) => {
    console.error('WebSocket ошибка:', error);
  });
});

// Периодическая отправка системных сообщений
setInterval(() => {
  const systemMessage = {
    type: 'system',
    message: `Сервер работает. Подключено клиентов: ${clients.size}`,
    timestamp: new Date().toISOString()
  };
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(systemMessage));
    }
  });
}, 30000); // Каждые 30 секунд

// Запуск сервера
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`
🚀 WebSocket сервер запущен!
📡 HTTP сервер: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
📁 Статика: ./control_center/development/

Для тестирования:
1. Откройте http://localhost:${PORT} в браузере
2. Перейдите на вкладку "Чат с Атласом"
3. Отправьте сообщение
  `);
});

// Обработка завершения работы
process.on('SIGINT', () => {
  console.log('\nЗавершение работы сервера...');
  wss.close();
  server.close();
  process.exit(0);
});