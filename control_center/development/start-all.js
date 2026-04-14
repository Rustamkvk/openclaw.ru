#!/usr/bin/env node

/**
 * Скрипт для запуска всех компонентов Контрольного центра Атласа
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Запуск Контрольного центра Атласа...\n');

// Пути к файлам
const authServerPath = path.join(__dirname, 'simple-auth-server.js');
const websocketServerPath = path.join(__dirname, 'websocket-server.js');
const httpServerPath = path.join(__dirname, 'simple-http-server.js');

// Проверка существования файлов
if (!fs.existsSync(authServerPath)) {
  console.error('❌ Файл auth-server.js не найден');
  process.exit(1);
}

if (!fs.existsSync(websocketServerPath)) {
  console.error('❌ Файл websocket-server.js не найден');
  process.exit(1);
}

// Массив для хранения процессов
const processes = [];

// Функция для запуска процесса
function startProcess(name, command, args, env = {}) {
  console.log(`▶️  Запуск ${name}...`);
  
  const processEnv = { ...process.env, ...env };
  const proc = spawn(command, args, {
    stdio: 'pipe',
    env: processEnv,
    shell: true
  });
  
  processes.push({ name, proc });
  
  // Логирование вывода
  proc.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data.toString().trim()}`);
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
  // 1. Запуск Auth сервера (порт 3001)
  startProcess('Auth Server', 'node', [authServerPath]);
  
  // 2. Запуск WebSocket сервера (порт 8081)
  startProcess('WebSocket Server', 'node', [websocketServerPath]);
  
  // 3. Запуск HTTP сервера для статических файлов (порт 8082)
  startProcess('HTTP Server', 'node', [httpServerPath]);
  
  console.log('\n✅ Все компоненты запущены!');
  console.log('\n📊 Статус компонентов:');
  console.log('   🔐 Auth API:      http://localhost:3001/api');
  console.log('   🔌 WebSocket:     ws://localhost:8081');
  console.log('   🌐 Frontend:      http://localhost:8082');
  console.log('\n👤 Данные для входа по умолчанию:');
  console.log('   Имя пользователя: admin');
  console.log('   Пароль:           Admin123!');
  console.log('\n⚠️  Не забудьте сменить пароль администратора после первого входа!');
  console.log('\n🛑 Для остановки нажмите Ctrl+C\n');
  
  // Периодическая проверка состояния процессов
  setInterval(() => {
    processes.forEach(({ name, proc }) => {
      if (proc.killed) {
        console.error(`❌ ${name} завершился неожиданно. Перезапуск...`);
        // Здесь можно добавить логику перезапуска
      }
    });
  }, 10000);
  
} catch (error) {
  console.error('❌ Ошибка запуска:', error);
  stopAllProcesses();
}

// Экспорт для использования в других модулях
module.exports = { startAllProcesses: () => {
  // Эта функция может быть вызвана из других скриптов
  console.log('Запуск через модуль...');
} };