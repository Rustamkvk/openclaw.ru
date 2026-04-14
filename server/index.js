const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Путь к рабочей области OpenClaw
const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || '/Users/rustammitaev/.openclaw/workspace';

// Проверка здоровья
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'openclaw-dashboard-api'
  });
});

// Получение информации о системе
app.get('/api/system', async (req, res) => {
  try {
    const [statusResult, sessionsResult] = await Promise.all([
      execAsync('openclaw status --json'),
      execAsync('openclaw sessions list --json')
    ]);

    const status = JSON.parse(statusResult.stdout);
    const sessions = JSON.parse(sessionsResult.stdout);

    res.json({
      status,
      sessions: sessions.slice(0, 10), // Ограничиваем количество
      workspace: WORKSPACE_PATH,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get system info', 
      details: error.message 
    });
  }
});

// Чтение файлов памяти
app.get('/api/memory', async (req, res) => {
  try {
    const memoryPath = path.join(WORKSPACE_PATH, 'MEMORY.md');
    const content = await fs.readFile(memoryPath, 'utf-8');
    
    // Парсим основные разделы
    const sections = content.split('## ').slice(1).map(section => {
      const [title, ...body] = section.split('\n');
      return {
        title: title.trim(),
        content: body.join('\n').trim(),
        lines: body.length
      };
    });

    res.json({
      file: 'MEMORY.md',
      sections,
      totalSections: sections.length,
      lastModified: (await fs.stat(memoryPath)).mtime
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read memory', 
      details: error.message 
    });
  }
});

// Получение списка daily notes
app.get('/api/memory/daily', async (req, res) => {
  try {
    const memoryDir = path.join(WORKSPACE_PATH, 'memory');
    const files = await fs.readdir(memoryDir);
    
    const dailyNotes = files
      .filter(file => file.endsWith('.md') && file.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort()
      .reverse()
      .slice(0, 7); // Последние 7 дней

    const notesWithStats = await Promise.all(
      dailyNotes.map(async (file) => {
        const filePath = path.join(memoryDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        return {
          date: file.replace('.md', ''),
          size: stats.size,
          lines: content.split('\n').length,
          lastModified: stats.mtime,
          preview: content.substring(0, 200) + '...'
        };
      })
    );

    res.json({
      directory: 'memory/',
      notes: notesWithStats,
      totalNotes: files.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read daily notes', 
      details: error.message 
    });
  }
});

// Запуск команды OpenClaw
app.post('/api/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || !command.startsWith('openclaw ')) {
      return res.status(400).json({ 
        error: 'Invalid command. Must start with "openclaw "' 
      });
    }

    // Безопасный список разрешенных команд
    const allowedCommands = [
      'status', 'sessions list', 'models list', 
      'config get', 'gateway status'
    ];

    const cmdName = command.replace('openclaw ', '').split(' ')[0];
    if (!allowedCommands.includes(cmdName)) {
      return res.status(403).json({ 
        error: 'Command not allowed', 
        allowed: allowedCommands 
      });
    }

    const result = await execAsync(command);
    
    res.json({
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Command execution failed', 
      details: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

// Получение информации о проекте
app.get('/api/project', async (req, res) => {
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf-8')
    );

    const gitResult = await execAsync('git log -1 --pretty=format:"%h %s"', {
      cwd: path.join(__dirname, '..')
    }).catch(() => ({ stdout: 'No commits' }));

    res.json({
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      lastCommit: gitResult.stdout.trim(),
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get project info', 
      details: error.message 
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Dashboard API запущен на порту ${PORT}`);
  console.log(`📁 Рабочая область: ${WORKSPACE_PATH}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});