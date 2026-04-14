#!/usr/bin/env node

// Система самопроверок и мониторинга для development версии
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const http = require('http');

class HealthCheck {
  constructor() {
    this.workspacePath = path.join(__dirname, '../..');
    this.developmentPath = path.join(this.workspacePath, 'control_center', 'development');
    this.results = {
      timestamp: new Date().toISOString(),
      checks: {},
      overall: 'unknown'
    };
  }
  
  async runAllChecks() {
    console.log('🔍 Запуск самопроверок системы...\n');
    
    await this.checkFileStructure();
    await this.checkWebSocketServer();
    await this.checkGitStatus();
    await this.checkMemoryIndex();
    await this.checkBackupSystem();
    await this.checkDependencies();
    await this.checkBrowserCompatibility();
    
    this.calculateOverallStatus();
    this.generateReport();
    
    return this.results;
  }
  
  async checkFileStructure() {
    console.log('📁 Проверка структуры файлов...');
    
    const requiredFiles = [
      'index.html',
      'script.js',
      'websocket-server.js',
      'backup-script.js',
      'package.json',
      'README.md'
    ];
    
    const missingFiles = [];
    const existingFiles = [];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(this.developmentPath, file);
      if (fs.existsSync(filePath)) {
        existingFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    });
    
    this.results.checks.fileStructure = {
      status: missingFiles.length === 0 ? 'healthy' : 'unhealthy',
      existing: existingFiles,
      missing: missingFiles,
      total: requiredFiles.length,
      found: existingFiles.length
    };
    
    if (missingFiles.length === 0) {
      console.log('✅ Все файлы на месте');
    } else {
      console.log(`❌ Отсутствуют файлы: ${missingFiles.join(', ')}`);
    }
  }
  
  async checkWebSocketServer() {
    console.log('🔌 Проверка WebSocket сервера...');
    
    return new Promise((resolve) => {
      const req = http.get('http://localhost:8081', (res) => {
        const status = res.statusCode === 200 ? 'healthy' : 'unhealthy';
        this.results.checks.webSocketServer = {
          status,
          port: 8081,
          statusCode: res.statusCode,
          message: status === 'healthy' ? 'Сервер отвечает' : 'Сервер не отвечает'
        };
        console.log(`✅ WebSocket сервер работает (порт 8081)`);
        resolve();
      });
      
      req.on('error', (err) => {
        this.results.checks.webSocketServer = {
          status: 'unhealthy',
          port: 8081,
          error: err.message,
          message: 'Сервер не запущен'
        };
        console.log('❌ WebSocket сервер не запущен');
        resolve();
      });
      
      req.setTimeout(3000, () => {
        this.results.checks.webSocketServer = {
          status: 'unhealthy',
          port: 8081,
          error: 'timeout',
          message: 'Таймаут подключения'
        };
        console.log('❌ Таймаут подключения к серверу');
        resolve();
      });
    });
  }
  
  async checkGitStatus() {
    console.log('📁 Проверка состояния Git...');
    
    try {
      const status = execSync('git status --porcelain', { 
        cwd: this.workspacePath,
        encoding: 'utf8'
      });
      
      const branch = execSync('git branch --show-current', {
        cwd: this.workspacePath,
        encoding: 'utf8'
      }).trim();
      
      const changes = status.trim().split('\n').filter(line => line);
      
      this.results.checks.gitStatus = {
        status: changes.length === 0 ? 'clean' : 'dirty',
        branch,
        changes: changes.length,
        message: changes.length === 0 ? 'Нет изменений' : `${changes.length} несохраненных изменений`
      };
      
      console.log(`✅ Git: ветка "${branch}", ${changes.length} изменений`);
      
    } catch (error) {
      this.results.checks.gitStatus = {
        status: 'error',
        error: error.message,
        message: 'Ошибка проверки Git'
      };
      console.log('❌ Ошибка проверки Git');
    }
  }
  
  async checkMemoryIndex() {
    console.log('🧠 Проверка индекса памяти...');
    
    const indexPath = path.join(this.workspacePath, 'memory_index.json');
    
    try {
      const stats = fs.statSync(indexPath);
      const content = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const age = Date.now() - stats.mtimeMs;
      const ageMinutes = Math.floor(age / (1000 * 60));
      
      this.results.checks.memoryIndex = {
        status: ageMinutes < 30 ? 'fresh' : 'stale',
        exists: true,
        documents: content.documents?.length || 0,
        lastModified: stats.mtime,
        ageMinutes,
        message: ageMinutes < 30 ? 'Индекс актуален' : 'Индекс устарел'
      };
      
      console.log(`✅ Индекс памяти: ${content.documents?.length || 0} документов, обновлен ${ageMinutes} минут назад`);
      
    } catch (error) {
      this.results.checks.memoryIndex = {
        status: 'missing',
        exists: false,
        error: error.message,
        message: 'Индекс памяти не найден'
      };
      console.log('❌ Индекс памяти не найден');
    }
  }
  
  async checkBackupSystem() {
    console.log('💾 Проверка системы бэкапов...');
    
    const backupsPath = path.join(this.workspacePath, 'control_center', 'backups');
    const today = new Date().toISOString().split('T')[0];
    const todayBackupsPath = path.join(backupsPath, today);
    
    try {
      let backupCount = 0;
      let latestBackup = null;
      
      if (fs.existsSync(todayBackupsPath)) {
        const backups = fs.readdirSync(todayBackupsPath)
          .filter(item => {
            const itemPath = path.join(todayBackupsPath, item);
            return fs.statSync(itemPath).isDirectory();
          });
        
        backupCount = backups.length;
        
        if (backupCount > 0) {
          backups.sort().reverse();
          latestBackup = backups[0];
        }
      }
      
      this.results.checks.backupSystem = {
        status: backupCount > 0 ? 'healthy' : 'no_backups',
        backupCount,
        latestBackup,
        backupsPath: todayBackupsPath,
        message: backupCount > 0 ? `${backupCount} бэкапов сегодня` : 'Бэкапов сегодня нет'
      };
      
      console.log(`✅ Система бэкапов: ${backupCount} бэкапов сегодня`);
      
    } catch (error) {
      this.results.checks.backupSystem = {
        status: 'error',
        error: error.message,
        message: 'Ошибка проверки бэкапов'
      };
      console.log('❌ Ошибка проверки бэкапов');
    }
  }
  
  async checkDependencies() {
    console.log('📦 Проверка зависимостей...');
    
    const packagePath = path.join(this.developmentPath, 'package.json');
    
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const nodeModulesPath = path.join(this.developmentPath, 'node_modules');
      
      const hasNodeModules = fs.existsSync(nodeModulesPath);
      const hasPackageJson = true;
      
      this.results.checks.dependencies = {
        status: hasNodeModules ? 'installed' : 'missing',
        hasNodeModules,
        hasPackageJson,
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length,
        message: hasNodeModules ? 'Зависимости установлены' : 'Зависимости не установлены'
      };
      
      console.log(`✅ Зависимости: ${hasNodeModules ? 'установлены' : 'не установлены'}`);
      
    } catch (error) {
      this.results.checks.dependencies = {
        status: 'error',
        error: error.message,
        message: 'Ошибка проверки зависимостей'
      };
      console.log('❌ Ошибка проверки зависимостей');
    }
  }
  
  async checkBrowserCompatibility() {
    console.log('🌐 Проверка совместимости с браузерами...');
    
    // Проверяем наличие современных JavaScript функций
    const features = {
      websocket: typeof WebSocket !== 'undefined',
      localstorage: typeof localStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      es6: typeof Map !== 'undefined' && typeof Set !== 'undefined'
    };
    
    const missingFeatures = Object.entries(features)
      .filter(([_, available]) => !available)
      .map(([name]) => name);
    
    this.results.checks.browserCompatibility = {
      status: missingFeatures.length === 0 ? 'compatible' : 'incompatible',
      features,
      missingFeatures,
      message: missingFeatures.length === 0 ? 'Совместим с современными браузерами' : `Отсутствуют функции: ${missingFeatures.join(', ')}`
    };
    
    console.log(`✅ Совместимость: ${missingFeatures.length === 0 ? 'полная' : 'частичная'}`);
  }
  
  calculateOverallStatus() {
    const checks = Object.values(this.results.checks);
    const healthyChecks = checks.filter(c => 
      c.status === 'healthy' || 
      c.status === 'clean' || 
      c.status === 'fresh' || 
      c.status === 'installed' || 
      c.status === 'compatible'
    ).length;
    
    const totalChecks = checks.length;
    const healthPercentage = Math.round((healthyChecks / totalChecks) * 100);
    
    let overallStatus = 'healthy';
    if (healthPercentage < 50) overallStatus = 'critical';
    else if (healthPercentage < 80) overallStatus = 'warning';
    
    this.results.overall = overallStatus;
    this.results.healthPercentage = healthPercentage;
    this.results.healthyChecks = healthyChecks;
    this.results.totalChecks = totalChecks;
  }
  
  generateReport() {
    console.log('\n📊 ОТЧЕТ О САМОПРОВЕРКАХ');
    console.log('=' .repeat(50));
    
    Object.entries(this.results.checks).forEach(([name, check]) => {
      const emoji = check.status.includes('healthy') || 
                   check.status.includes('clean') || 
                   check.status.includes('fresh') || 
                   check.status.includes('installed') || 
                   check.status.includes('compatible') ? '✅' : '❌';
      
      console.log(`${emoji} ${name}: ${check.message}`);
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log(`🏆 ОБЩИЙ СТАТУС: ${this.results.overall.toUpperCase()}`);
    console.log(`📈 Здоровье системы: ${this.results.healthPercentage}%`);
    console.log(`✅ Успешных проверок: ${this.results.healthyChecks}/${this.results.totalChecks}`);
    console.log(`🕐 Время проверки: ${new Date(this.results.timestamp).toLocaleTimeString('ru-RU')}`);
    
    // Сохраняем отчет в файл
    const reportPath = path.join(this.developmentPath, 'health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Отчет сохранен: ${reportPath}`);
    
    // Создаем человекочитаемый отчет
    this.generateHumanReadableReport();
  }
  
  generateHumanReadableReport() {
    const reportPath = path.join(this.developmentPath, 'health-report.md');
    
    let report = `# Отчет о самопроверках системы\n\n`;
    report += `**Время проверки:** ${new Date(this.results.timestamp).toLocaleString('ru-RU')}\n`;
    report += `**Общий статус:** ${this.results.overall === 'healthy' ? '✅ Здоров' : '⚠️ Требует внимания'}\n`;
    report += `**Здоровье системы:** ${this.results.healthPercentage}%\n\n`;
    
    report += `## 📊 Результаты проверок\n\n`;
    
    Object.entries(this.results.checks).forEach(([name, check]) => {
      const statusEmoji = check.status.includes('healthy') || 
                         check.status.includes('clean') || 
                         check.status.includes('fresh') || 
                         check.status.includes('installed') || 
                         check.status.includes('compatible') ? '✅' : '❌';
      
      report += `### ${statusEmoji} ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}\n`;
      report += `- **Статус:** ${check.status}\n`;
      report += `- **Сообщение:** ${check.message}\n`;
      
      if (check.error) {
        report += `- **Ошибка:** ${check.error}\n`;
      }
      
      if (check.changes !== undefined) {
        report += `- **Изменения:** ${check.changes}\n`;
      }
      
      if (check.documents !== undefined) {
        report += `- **Документы:** ${check.documents}\n`;
      }
      
      if (check.backupCount !== undefined) {
        report += `- **Бэкапы:** ${check.backupCount}\n`;
      }
      
      report += '\n';
    });
    
    report += `## 🚀 Рекомендации\n\n`;
    
    if (this.results.overall !== 'healthy') {
      report += `### Требуется внимание:\n`;
      
      Object.entries(this.results.checks).forEach(([name, check]) => {
        if (!(check.status.includes('healthy') || 
              check.status.includes('clean') || 
              check.status.includes('fresh') || 
              check.status.includes('installed') || 
              check.status.includes('compatible'))) {
          
          report += `1. **${name}:** ${check.message}\n`;
          
          // Добавляем рекомендации по исправлению
          if (name === 'webSocketServer' && check.status === 'unhealthy') {
            report += `   - Запустите сервер: \`npm start\` в папке development\n`;
          }
          
          if (name === 'dependencies' && check.status === 'missing') {
            report += `   - Установите зависимости: \`npm install\`\n`;
          }
          
          if (name === 'memoryIndex' && check.status === 'stale') {
            report += `   - Обновите индекс: \`python3 generate_memory_index.py\`\n`;
          }
          
          if (name === 'backupSystem' && check.status === 'no_backups') {
            report += `   - Создайте бэкап: \`node backup-script.js create\`\n`;
          }
        }
      });
    } else {
      report += `✅ Все системы работают нормально. Продолжайте разработку!\n`;
    }
    
    report += `\n## 🔄 Автоматическое восстановление\n\n`;
    report += `Для автоматического восстановления запустите:\n`;
    report += `\`\`\`bash\nnode health-check.js --fix\n\`\`\`\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📝 Человекочитаемый отчет: ${reportPath}`);
  }
}

// CLI интерфейс
const args = process.argv.slice(2);
const command = args[0];

if (command === '--fix') {
  console.log('🛠️  Запуск автоматического исправления...');
  // Здесь будет логика исправления
} else {
  const healthCheck = new HealthCheck();
  healthCheck.runAllChecks();
}