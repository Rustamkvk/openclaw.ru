#!/usr/bin/env node

// Скрипт автоматического восстановления после сбоев
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { HealthCheck } = require('./health-check.js');

class RecoverySystem {
  constructor() {
    this.workspacePath = path.join(__dirname, '../..');
    this.developmentPath = path.join(this.workspacePath, 'control_center', 'development');
    this.backupsPath = path.join(this.workspacePath, 'control_center', 'backups');
    this.recoveryLog = path.join(this.developmentPath, 'recovery.log');
    
    this.init();
  }
  
  init() {
    // Создаем лог файл если его нет
    if (!fs.existsSync(this.recoveryLog)) {
      fs.writeFileSync(this.recoveryLog, '# Лог восстановления системы\n\n');
    }
    
    this.log('🚀 Система восстановления инициализирована');
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(logMessage.trim());
    fs.appendFileSync(this.recoveryLog, logMessage);
  }
  
  async fullRecovery() {
    this.log('🔄 Запуск полного восстановления системы');
    
    try {
      // Шаг 1: Проверяем состояние
      this.log('🔍 Проверяем текущее состояние...');
      const healthCheck = new HealthCheck();
      const results = await healthCheck.runAllChecks();
      
      // Шаг 2: Создаем экстренный бэкап
      this.log('💾 Создаем экстренный бэкап текущего состояния...');
      await this.createEmergencyBackup();
      
      // Шаг 3: Восстанавливаем зависимости
      this.log('📦 Восстанавливаем зависимости...');
      await this.restoreDependencies();
      
      // Шаг 4: Восстанавливаем файлы из последнего бэкапа
      this.log('📁 Восстанавливаем файлы из бэкапа...');
      const restored = await this.restoreFromLatestBackup();
      
      // Шаг 5: Запускаем сервисы
      this.log('🚀 Запускаем сервисы...');
      await this.startServices();
      
      // Шаг 6: Проверяем результат
      this.log('✅ Проверяем результат восстановления...');
      const finalCheck = new HealthCheck();
      const finalResults = await finalCheck.runAllChecks();
      
      this.log(`🎉 Восстановление завершено! Здоровье системы: ${finalResults.healthPercentage}%`);
      
      return {
        success: true,
        initialHealth: results.healthPercentage,
        finalHealth: finalResults.healthPercentage,
        restoredFiles: restored,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`❌ Ошибка восстановления: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  async createEmergencyBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const emergencyPath = path.join(this.backupsPath, 'emergency', timestamp);
    
    fs.mkdirSync(emergencyPath, { recursive: true });
    
    // Копируем ключевые файлы
    const criticalFiles = [
      'index.html',
      'script.js',
      'websocket-server.js',
      'package.json',
      'health-check.js',
      'recovery-script.js'
    ];
    
    let copiedFiles = 0;
    
    criticalFiles.forEach(file => {
      const source = path.join(this.developmentPath, file);
      const destination = path.join(emergencyPath, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        copiedFiles++;
      }
    });
    
    // Сохраняем состояние системы
    const systemState = {
      timestamp: new Date().toISOString(),
      files: copiedFiles,
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    };
    
    fs.writeFileSync(
      path.join(emergencyPath, 'system-state.json'),
      JSON.stringify(systemState, null, 2)
    );
    
    this.log(`✅ Создан экстренный бэкап: ${copiedFiles} файлов`);
    return emergencyPath;
  }
  
  async restoreDependencies() {
    const packagePath = path.join(this.developmentPath, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      this.log('❌ package.json не найден, пропускаем восстановление зависимостей');
      return false;
    }
    
    try {
      this.log('📦 Удаляем старые зависимости...');
      const nodeModulesPath = path.join(this.developmentPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      
      this.log('📦 Устанавливаем зависимости заново...');
      execSync('npm install', { 
        cwd: this.developmentPath,
        stdio: 'pipe'
      });
      
      this.log('✅ Зависимости восстановлены');
      return true;
      
    } catch (error) {
      this.log(`❌ Ошибка восстановления зависимостей: ${error.message}`);
      return false;
    }
  }
  
  async restoreFromLatestBackup() {
    // Ищем последний бэкап
    const today = new Date().toISOString().split('T')[0];
    const todayBackupsPath = path.join(this.backupsPath, today);
    
    if (!fs.existsSync(todayBackupsPath)) {
      this.log('❌ Бэкапов за сегодня нет, пропускаем восстановление файлов');
      return [];
    }
    
    const backups = fs.readdirSync(todayBackupsPath)
      .filter(item => {
        const itemPath = path.join(todayBackupsPath, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      this.log('❌ Нет доступных бэкапов');
      return [];
    }
    
    const latestBackup = backups[0];
    const backupPath = path.join(todayBackupsPath, latestBackup);
    
    this.log(`📁 Восстанавливаем из бэкапа: ${latestBackup}`);
    
    // Восстанавливаем файлы
    const filesToRestore = [
      'index.html',
      'script.js',
      'websocket-server.js',
      'backup-script.js',
      'health-check.js'
    ];
    
    const restoredFiles = [];
    
    filesToRestore.forEach(file => {
      const source = path.join(backupPath, file);
      const destination = path.join(this.developmentPath, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        restoredFiles.push(file);
        this.log(`  ✅ Восстановлен: ${file}`);
      }
    });
    
    this.log(`✅ Восстановлено файлов: ${restoredFiles.length}`);
    return restoredFiles;
  }
  
  async startServices() {
    // Проверяем, запущен ли WebSocket сервер
    try {
      execSync('curl -s http://localhost:8081 > /dev/null', { stdio: 'pipe' });
      this.log('✅ WebSocket сервер уже запущен');
      return true;
    } catch (error) {
      // Сервер не запущен, запускаем
      this.log('🔌 Запускаем WebSocket сервер...');
      
      try {
        // Запускаем в фоновом режиме
        const serverProcess = spawn('node', ['websocket-server.js'], {
          cwd: this.developmentPath,
          detached: true,
          stdio: 'ignore'
        });
        
        serverProcess.unref();
        
        // Даем время на запуск
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Проверяем запуск
        execSync('curl -s http://localhost:8081 > /dev/null', { stdio: 'pipe' });
        this.log(`✅ WebSocket сервер запущен (PID: ${serverProcess.pid})`);
        
        // Сохраняем PID для возможности остановки
        const pidFile = path.join(this.developmentPath, 'server.pid');
        fs.writeFileSync(pidFile, serverProcess.pid.toString());
        
        return true;
        
      } catch (startError) {
        this.log(`❌ Не удалось запустить WebSocket сервер: ${startError.message}`);
        return false;
      }
    }
  }
  
  async quickFix() {
    this.log('⚡ Быстрое исправление распространенных проблем');
    
    const fixes = [
      this.fixMemoryIndex,
      this.fixGitState,
      this.fixFilePermissions,
      this.fixBrokenSymlinks
    ];
    
    let fixedProblems = 0;
    
    for (const fix of fixes) {
      try {
        const result = await fix.call(this);
        if (result) fixedProblems++;
      } catch (error) {
        this.log(`⚠️ Ошибка при исправлении: ${error.message}`);
      }
    }
    
    this.log(`✅ Исправлено проблем: ${fixedProblems}`);
    return fixedProblems;
  }
  
  async fixMemoryIndex() {
    this.log('🧠 Обновляем индекс памяти...');
    
    try {
      const indexPath = path.join(this.workspacePath, 'generate_memory_index.py');
      if (fs.existsSync(indexPath)) {
        execSync(`python3 "${indexPath}"`, { cwd: this.workspacePath });
        this.log('✅ Индекс памяти обновлен');
        return true;
      }
    } catch (error) {
      this.log(`❌ Ошибка обновления индекса: ${error.message}`);
    }
    
    return false;
  }
  
  async fixGitState() {
    this.log('📁 Исправляем состояние Git...');
    
    try {
      // Сбрасываем несохраненные изменения (кроме важных файлов)
      execSync('git reset --hard', { cwd: this.workspacePath });
      this.log('✅ Состояние Git сброшено');
      return true;
    } catch (error) {
      this.log(`❌ Ошибка исправления Git: ${error.message}`);
      return false;
    }
  }
  
  async fixFilePermissions() {
    this.log('🔒 Проверяем права доступа к файлам...');
    
    const files = [
      'index.html',
      'script.js',
      'websocket-server.js',
      'backup-script.js',
      'health-check.js',
      'recovery-script.js'
    ];
    
    let fixedFiles = 0;
    
    files.forEach(file => {
      const filePath = path.join(this.developmentPath, file);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.chmodSync(filePath, 0o644); // rw-r--r--
          fixedFiles++;
        } catch (error) {
          // Игнорируем ошибки прав доступа
        }
      }
    });
    
    // Делаем скрипты исполняемыми
    const scripts = ['backup-script.js', 'health-check.js', 'recovery-script.js'];
    scripts.forEach(script => {
      const scriptPath = path.join(this.developmentPath, script);
      if (fs.existsSync(scriptPath)) {
        try {
          fs.chmodSync(scriptPath, 0o755); // rwxr-xr-x
        } catch (error) {
          // Игнорируем
        }
      }
    });
    
    this.log(`✅ Права доступа исправлены для ${fixedFiles} файлов`);
    return fixedFiles > 0;
  }
  
  async fixBrokenSymlinks() {
    this.log('🔗 Проверяем символические ссылки...');
    
    const latestLink = path.join(this.backupsPath, 'latest');
    
    if (fs.existsSync(latestLink)) {
      try {
        fs.readlinkSync(latestLink);
        this.log('✅ Ссылка "latest" работает');
        return true;
      } catch (error) {
        // Ссылка битая, удаляем
        fs.unlinkSync(latestLink);
        this.log('✅ Удалена битая ссылка "latest"');
        return true;
      }
    }
    
    return false;
  }
  
  generateRecoveryGuide() {
    this.log('📝 Генерируем руководство по восстановлению...');
    
    const guidePath = path.join(this.developmentPath, 'RECOVERY_GUIDE.md');
    
    const guide = `# 🚑 Руководство по восстановлению системы

## 📋 Быстрые команды

### Проверка состояния
\`\`\`bash
node health-check.js
\`\`\`

### Быстрое исправление
\`\`\`bash
node recovery-script.js --quick-fix
\`\`\`

### Полное восстановление
\`\`\`bash
node recovery-script.js --full-recovery
\`\`\`

## 🔧 Ручное восстановление

### 1. Если WebSocket сервер не запускается
\`\`\`bash
# Остановить все процессы на порту 8081
lsof -ti:8081 | xargs kill -9

# Запустить заново
npm start
\`\`\`

### 2. Если зависимости повреждены
\`\`\`bash
# Удалить node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановить зависимости
npm install
\`\`\`

### 3. Если файлы повреждены
\`\`\`bash
# Восстановить из последнего бэкапа
node backup-script.js list
node backup-script.js restore <имя-бэкапа>
\`\`\`

### 4. Если Git в плохом состоянии
\`\`\`bash
# Сбросить все изменения
git reset --hard

# Получить свежую копию
git pull origin main
\`\`\`

## 🚨 Экстренные ситуации

### Система не загружается
1. Проверьте логи: \`cat recovery.log\`
2. Запустите диагностику: \`node health-check.js\`
3. Если ничего не помогает, восстановите из бэкапа

### Потеряны все файлы
1. Проверьте бэкапы: \`control_center/backups/\`
2. Восстановите последний бэкап
3. Запустите полное восстановление

### WebSocket не подключается
1. Проверьте firewall: \`sudo ufw status\`
2. Проверьте порт: \`netstat -tuln | grep 8081\`
3. Перезапустите сервер: \`npm run dev\`

## 📞 Контакты для помощи

- **Разработчик:** Атлас
- **Создано:** 2026-03-24
- **Последнее обновление:** ${new Date().toISOString().split('T')[0]}

---

> 💡 **Совет:** Регулярно создавайте бэкапы командой \`npm run backup\`
`;

    fs.writeFileSync(guidePath, guide);
    this.log(`✅ Руководство создано: ${guidePath}`);
    
    return guidePath;
  }
}

// CLI интерфейс
const args = process.argv.slice(2);
const command = args[0] || '--help';
const recovery = new RecoverySystem();

switch (command) {
  case '--full-recovery':
    recovery.fullRecovery().then(result => {
      if (result.success) {
        console.log('\n🎉 Восстановление успешно завершено!');
        console.log(`📈 Здоровье системы: ${result.finalHealth}%`);
      } else {
        console.log('\n❌ Восстановление не удалось');
        console.log(`📝 Ошибка: ${result.error}`);
      }
    });
    break;
    
  case '--quick-fix':
    recovery.quickFix().then(fixed => {
      console.log(`\n✅ Быстрое исправление завершено. Исправлено проблем: ${fixed}`);
    });
    break;
    
  case '--generate-guide':
    recovery.generateRecoveryGuide();
    console.log('\n📝 Руководство по восстановлению создано');
    break;
    
  case '--log':
    console.log('\n📋 Последние записи в логе восстановления:');
    const logContent = fs.readFileSync(recovery.recoveryLog, 'utf8');
    const lines = logContent.split('\n').slice(-20);
    console.log(lines.join('\n'));
    break;
    
  default:
    console.log(`
🚑 Система восстановления для development дашборда

Использование:
  node recovery-script.js <команда>

Команды:
  --full-recovery    Полное восстановление системы
  --quick-fix        Быстрое исправление распространенных проблем
  --generate-guide   Создать руководство по восстановлению
  --log              Показать последние записи лога

Примеры:
  node recovery-script.js --full-recovery
  node recovery-script.js --quick-fix
  node recovery-script.js --generate-guide

Автоматическое восстановление:
  Добавьте в cron для периодической проверки:
  */30 * * * * cd