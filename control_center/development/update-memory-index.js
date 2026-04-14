#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Пути
const workspacePath = path.join(__dirname, '../..');
const memoryPath = path.join(workspacePath, 'memory');
const memoryIndexPath = path.join(__dirname, 'memory_index.json');

console.log('🔄 Обновление индекса памяти для Контрольного центра...');
console.log(`📁 Рабочая область: ${workspacePath}`);
console.log(`📝 Папка памяти: ${memoryPath}`);

// Функция для получения списка файлов памяти
function getMemoryFiles() {
  const files = [];
  
  try {
    // Проверяем существование папки memory
    if (!fs.existsSync(memoryPath)) {
      console.log('⚠️ Папка memory не существует');
      return files;
    }
    
    // Получаем все .md файлы в папке memory
    const memoryFiles = fs.readdirSync(memoryPath)
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        name: file,
        path: path.join(memoryPath, file),
        date: file.replace('.md', '')
      }));
    
    // Добавляем MEMORY.md из корня
    const mainMemoryPath = path.join(workspacePath, 'MEMORY.md');
    if (fs.existsSync(mainMemoryPath)) {
      memoryFiles.push({
        name: 'MEMORY.md',
        path: mainMemoryPath,
        date: 'main'
      });
    }
    
    // Сортируем по дате (сначала свежие)
    memoryFiles.sort((a, b) => {
      if (a.date === 'main') return -1;
      if (b.date === 'main') return 1;
      return b.date.localeCompare(a.date);
    });
    
    return memoryFiles;
  } catch (error) {
    console.error('❌ Ошибка при чтении файлов памяти:', error.message);
    return files;
  }
}

// Функция для создания индекса
function createMemoryIndex(files) {
  const index = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    files: []
  };
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split('\n');
      const firstLines = lines.slice(0, 10).join('\n');
      
      index.files.push({
        name: file.name,
        date: file.date,
        path: file.path,
        size: content.length,
        lines: lines.length,
        preview: firstLines.substring(0, 500) + (firstLines.length > 500 ? '...' : ''),
        lastModified: fs.statSync(file.path).mtime.toISOString()
      });
    } catch (error) {
      console.log(`⚠️ Не удалось прочитать файл ${file.name}: ${error.message}`);
    }
  }
  
  return index;
}

// Основная логика
const memoryFiles = getMemoryFiles();
console.log(`📊 Найдено файлов памяти: ${memoryFiles.length}`);

if (memoryFiles.length > 0) {
  const index = createMemoryIndex(memoryFiles);
  
  // Сохраняем индекс
  fs.writeFileSync(memoryIndexPath, JSON.stringify(index, null, 2));
  console.log(`✅ Индекс памяти обновлен: ${memoryIndexPath}`);
  console.log(`📅 Последнее обновление: ${index.timestamp}`);
  console.log(`📁 Файлов в индексе: ${index.totalFiles}`);
  
  // Создаем симлинк для удобства (только если не существует или не циклический)
  const symlinkPath = path.join(workspacePath, 'memory_index.json');
  try {
    // Проверяем, не является ли существующий файл симлинком на самого себя
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(symlinkPath);
        if (target === symlinkPath || target === 'memory_index.json') {
          console.log(`⚠️ Удаляем циклический симлинк: ${symlinkPath} -> ${target}`);
          fs.unlinkSync(symlinkPath);
        }
      } else {
        // Это обычный файл, удаляем его
        fs.unlinkSync(symlinkPath);
      }
    }
    
    // Создаем новый симлинк
    fs.symlinkSync(memoryIndexPath, symlinkPath);
    console.log(`🔗 Создан симлинк: ${symlinkPath} -> ${memoryIndexPath}`);
  } catch (error) {
    console.log(`ℹ️ Не удалось создать симлинк: ${error.message}`);
    console.log(`📁 Вместо этого копируем файл...`);
    fs.copyFileSync(memoryIndexPath, symlinkPath);
    console.log(`✅ Файл скопирован: ${symlinkPath}`);
  }
} else {
  console.log('ℹ️ Файлы памяти не найдены, создаем пустой индекс');
  const emptyIndex = {
    timestamp: new Date().toISOString(),
    totalFiles: 0,
    files: []
  };
  fs.writeFileSync(memoryIndexPath, JSON.stringify(emptyIndex, null, 2));
  console.log(`✅ Пустой индекс создан: ${memoryIndexPath}`);
}

console.log('🎉 Обновление индекса памяти завершено!');