#!/usr/bin/env node

// Скрипт для автоматического создания бэкапов development версии
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupManager {
  constructor() {
    this.workspacePath = path.join(__dirname, '../..');
    this.controlCenterPath = path.join(this.workspacePath, 'control_center');
    this.developmentPath = path.join(this.controlCenterPath, 'development');
    this.backupsPath = path.join(this.controlCenterPath, 'backups');
    
    this.ensureDirectories();
  }
  
  ensureDirectories() {
    // Создаем необходимые директории
    const dirs = [
      this.backupsPath,
      path.join(this.backupsPath, this.getDateFolder())
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Создана директория: ${dir}`);
      }
    });
  }
  
  getDateFolder() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  getTimestamp() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  }
  
  createBackup() {
    const dateFolder = this.getDateFolder();
    const timestamp = this.getTimestamp();
    const backupFolder = path.join(this.backupsPath, dateFolder, timestamp);
    
    // Создаем папку для бэкапа
    fs.mkdirSync(backupFolder, { recursive: true });
    
    // Копируем файлы из development
    const filesToBackup = [
      'index.html',
      'script.js',
      'websocket-server.js',
      'backup-script.js'
    ];
    
    let backedUpFiles = 0;
    
    filesToBackup.forEach(file => {
      const source = path.join(this.developmentPath, file);
      const destination = path.join(backupFolder, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        backedUpFiles++;
        console.log(`📁 Скопирован: ${file}`);
      }
    });
    
    // Создаем файл с метаданными
    const metadata = {
      timestamp: new Date().toISOString(),
      files: backedUpFiles,
      folder: backupFolder,
      gitHash: this.getGitHash()
    };
    
    fs.writeFileSync(
      path.join(backupFolder, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Создаем симлинк latest
    const latestPath = path.join(this.backupsPath, 'latest');
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    fs.symlinkSync(backupFolder, latestPath, 'dir');
    
    console.log(`
✅ Бэкап создан успешно!
📁 Папка: ${backupFolder}
📊 Файлов: ${backedUpFiles}
🕐 Время: ${new Date().toLocaleTimeString('ru-RU')}
🔗 Latest: ${latestPath}
    `);
    
    return backupFolder;
  }
  
  getGitHash() {
    try {
      return execSync('git rev-parse --short HEAD', { cwd: this.workspacePath })
        .toString()
        .trim();
    } catch (error) {
      return 'unknown';
    }
  }
  
  listBackups() {
    const dateFolder = this.getDateFolder();
    const todayBackupsPath = path.join(this.backupsPath, dateFolder);
    
    if (!fs.existsSync(todayBackupsPath)) {
      console.log('📭 Бэкапов за сегодня нет');
      return [];
    }
    
    const backups = fs.readdirSync(todayBackupsPath)
      .filter(item => {
        const itemPath = path.join(todayBackupsPath, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .sort()
      .reverse();
    
    console.log(`📋 Бэкапы за ${dateFolder}:`);
    backups.forEach(backup => {
      const backupPath = path.join(todayBackupsPath, backup);
      const metadataPath = path.join(backupPath, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const time = new Date(metadata.timestamp).toLocaleTimeString('ru-RU');
        console.log(`  ⏰ ${backup} (${time}) - ${metadata.files} файлов`);
      } else {
        console.log(`  📁 ${backup}`);
      }
    });
    
    return backups;
  }
  
  restoreBackup(backupName) {
    const dateFolder = this.getDateFolder();
    const backupPath = path.join(this.backupsPath, dateFolder, backupName);
    
    if (!fs.existsSync(backupPath)) {
      console.log(`❌ Бэкап не найден: ${backupName}`);
      return false;
    }
    
    console.log(`🔄 Восстанавливаю бэкап: ${backupName}`);
    
    // Создаем бэкап текущего состояния
    console.log('💾 Создаю бэкап текущего состояния...');
    this.createBackup();
    
    // Восстанавливаем файлы
    const files = ['index.html', 'script.js', 'websocket-server.js', 'backup-script.js'];
    
    files.forEach(file => {
      const source = path.join(backupPath, file);
      const destination = path.join(this.developmentPath, file);
      
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        console.log(`✅ Восстановлен: ${file}`);
      }
    });
    
    console.log(`
🎉 Восстановление завершено!
📁 Из бэкапа: ${backupName}
📁 В папку: ${this.developmentPath}
    `);
    
    return true;
  }
}

// CLI интерфейс
const args = process.argv.slice(2);
const command = args[0];
const backupManager = new BackupManager();

switch (command) {
  case 'create':
    backupManager.createBackup();
    break;
    
  case 'list':
    backupManager.listBackups();
    break;
    
  case 'restore':
    if (args[1]) {
      backupManager.restoreBackup(args[1]);
    } else {
      console.log('❌ Укажите имя бэкапа для восстановления');
      console.log('   Пример: node backup-script.js restore 14-30-00');
    }
    break;
    
  case 'auto':
    // Автоматический режим - создает бэкап каждые 30 минут
    console.log('🤖 Автоматический режим бэкапов (каждые 30 минут)');
    console.log('Нажмите Ctrl+C для остановки');
    
    setInterval(() => {
      console.log('\n⏰ Проверяю необходимость бэкапа...');
      backupManager.createBackup();
    }, 30 * 60 * 1000); // 30 минут
    
    // Создаем первый бэкап сразу
    backupManager.createBackup();
    
    // Бесконечный цикл
    setInterval(() => {}, 1000);
    break;
    
  default:
    console.log(`
📋 Менеджер бэкапов для development дашборда

Использование:
  node backup-script.js <команда> [аргументы]

Команды:
  create    - Создать новый бэкап
  list      - Показать список бэкапов
  restore <name> - Восстановить из бэкапа
  auto      - Автоматический режим (каждые 30 минут)

Примеры:
  node backup-script.js create
  node backup-script.js list
  node backup-script.js restore 14-30-00
  node backup-script.js auto
    `);
    break;
}