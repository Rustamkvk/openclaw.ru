#!/usr/bin/env node

/**
 * Скрипт для запуска упрощенной версии Контрольного центра Атласа
 * с авторизацией на основе JSON файлов
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Запуск упрощенной версии Контрольного центра Атласа...\n');

// Проверяем наличие необходимых файлов
const requiredFiles = [
  'simple-auth-server.js',
  'simple-db.js',
  'websocket-server.js',
  'index.html',
  'auth.js',
  'script.js'
];

console.log('🔍 Проверка файлов...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - НЕ НАЙДЕН`);
    process.exit(1);
  }
});

// Массив для хранения процессов
const processes = [];

// Функция для запуска процесса
function startProcess(name, command, args, env = {}) {
  console.log(`\n▶️  Запуск ${name}...`);
  
  const processEnv = { ...process.env, ...env };
  const proc = spawn(command, args, {
    stdio: 'pipe',
    env: processEnv,
    shell: true,
    cwd: __dirname
  });
  
  processes.push({ name, proc });
  
  // Логирование вывода
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${name}] ${output}`);
    }
  });
  
  proc.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error) {
      console.error(`[${name} ERROR] ${error}`);
    }
  });
  
  proc.on('close', (code) => {
    console.log(`[${name}] Процесс завершен с кодом ${code}`);
    
    // Если процесс завершился с ошибкой, останавливаем все
    if (code !== 0 && code !== null) {
      console.error(`❌ ${name} завершился с ошибкой. Останавливаем все процессы...`);
      stopAllProcesses();
    }
  });
  
  return proc;
}

// Функция для остановки всех процессов
function stopAllProcesses() {
  console.log('\n🛑 Остановка всех процессов...');
  
  processes.forEach(({ name, proc }) => {
    if (!proc.killed) {
      console.log(`⏹️  Остановка ${name}...`);
      proc.kill('SIGTERM');
    }
  });
  
  setTimeout(() => {
    processes.forEach(({ name, proc }) => {
      if (!proc.killed) {
        console.log(`🔫 Принудительная остановка ${name}...`);
        proc.kill('SIGKILL');
      }
    });
    console.log('✅ Все процессы остановлены');
    process.exit(0);
  }, 3000);
}

// Обработка сигналов завершения
process.on('SIGINT', stopAllProcesses);
process.on('SIGTERM', stopAllProcesses);

// Запуск компонентов
try {
  console.log('\n🚀 Запуск компонентов системы...');
  
  // 1. Запуск Simple Auth сервера (порт 3001)
  startProcess('Auth Server', 'node', ['simple-auth-server.js']);
  
  // 2. Запуск WebSocket сервера (порт 8081)
  startProcess('WebSocket Server', 'node', ['websocket-server.js']);
  
  // 3. Запуск HTTP сервера для статических файлов (порт 8080)
  const httpServerCode = `
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const url = require('url');
    
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain',
      '.md': 'text/markdown'
    };
    
    const server = http.createServer((req, res) => {
      console.log(\`\${req.method} \${req.url}\`);
      
      // Разбираем URL
      const parsedUrl = url.parse(req.url);
      let pathname = \`.\${parsedUrl.pathname}\`;
      
      // Если путь заканчивается на /, добавляем index.html
      if (pathname.endsWith('/')) {
        pathname += 'index.html';
      }
      
      // Если путь пустой, используем index.html
      if (pathname === './') {
        pathname = './index.html';
      }
      
      // Получаем расширение файла
      const extname = path.extname(pathname);
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      
      // Проверяем существование файла
      fs.exists(pathname, (exists) => {
        if (!exists) {
          // Если файл не найден, пробуем index.html
          if (pathname !== './index.html') {
            pathname = './index.html';
            fs.exists(pathname, (exists2) => {
              if (!exists2) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>Файл не найден</p>');
              } else {
                serveFile(pathname, contentType, res);
              }
            });
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1><p>Файл не найден</p>');
          }
          return;
        }
        
        serveFile(pathname, contentType, res);
      });
    });
    
    function serveFile(filePath, contentType, res) {
      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(500);
          res.end(\`Ошибка сервера: \${error.code}\`);
        } else {
          res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(content, 'utf-8');
        }
      });
    }
    
    const PORT = 8080;
    server.listen(PORT, () => {
      console.log(\`HTTP сервер запущен на порту \${PORT}\`);
      console.log(\`Откройте http://localhost:\${PORT} в браузере\`);
    });
  `;
  
  startProcess('HTTP Server', 'node', ['-e', httpServerCode]);
  
  // Даем время на запуск
  setTimeout(() => {
    console.log('\n✅ Все компоненты запущены!');
    console.log('\n📊 Статус компонентов:');
    console.log('   🔐 Auth API:      http://localhost:3001/api');
    console.log('   🔌 WebSocket:     ws://localhost:8081');
    console.log('   🌐 Frontend:      http://localhost:8080');
    console.log('\n👤 Данные для входа по умолчанию:');
    console.log('   Имя пользователя: admin');
    console.log('   Пароль:           Admin123!');
    console.log('\n💾 База данных: JSON файлы в папке data/');
    console.log('\n⚠️  ВАЖНО: Смените пароль администратора после первого входа!');
    console.log('\n🛑 Для остановки нажмите Ctrl+C\n');
    
    // Проверка здоровья через 3 секунды
    setTimeout(() => {
      console.log('🔍 Проверка здоровья системы...');
      
      const http = require('http');
      
      const checkHealth = (url, name) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) {
            console.log(`   ✅ ${name} работает`);
          } else {
            console.log(`   ⚠️  ${name} отвечает с кодом ${res.statusCode}`);
          }
        });
        
        req.on('error', (err) => {
          console.log(`   ❌ ${name} недоступен: ${err.message}`);
        });
        
        req.setTimeout(3000, () => {
          console.log(`   ⏱️  ${name}: таймаут запроса`);
          req.destroy();
        });
      };
      
      checkHealth('http://localhost:3001/api/health', 'Auth Server');
      checkHealth('http://localhost:8080', 'HTTP Server');
      
    }, 3000);
    
  }, 2000);
  
  // Периодическая проверка состояния процессов
  const healthCheckInterval = setInterval(() => {
    processes.forEach(({ name, proc }) => {
      if (proc.killed) {
        console.error(`❌ ${name} завершился неожиданно.`);
        clearInterval(healthCheckInterval);
        stopAllProcesses();
      }
    });
  }, 10000);
  
} catch (error) {
  console.error('❌ Ошибка запуска:', error);
  stopAllProcesses();
}

// Экспорт для использования в других модулях
module.exports = { startSimpleSystem: () => {
  console.log('Запуск упрощенной системы через модуль...');
} };