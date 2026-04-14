#!/usr/bin/env node

/**
 * Скрипт для смены пароля администратора
 * Использование: node change_admin_password.js [новый_пароль]
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Путь к файлу с пользователями
const usersFilePath = path.join(__dirname, 'data', 'users.json');

// Проверяем наличие файла
if (!fs.existsSync(usersFilePath)) {
    console.error('❌ Файл users.json не найден');
    console.log('Запустите сначала Контрольный центр для создания базы данных');
    process.exit(1);
}

// Получаем новый пароль из аргументов или запрашиваем
let newPassword = process.argv[2];

if (!newPassword) {
    console.log('🔐 Смена пароля администратора');
    console.log('===============================');
    console.log('');
    console.log('⚠️  ВНИМАНИЕ: Пароль должен быть надежным!');
    console.log('   Рекомендуется: минимум 8 символов, буквы, цифры, спецсимволы');
    console.log('');
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    readline.question('Введите новый пароль: ', (password) => {
        newPassword = password;
        readline.close();
        changePassword(newPassword);
    });
} else {
    changePassword(newPassword);
}

function changePassword(password) {
    // Проверяем сложность пароля
    if (password.length < 8) {
        console.error('❌ Пароль слишком короткий (минимум 8 символов)');
        process.exit(1);
    }
    
    if (!/[A-Z]/.test(password)) {
        console.error('❌ Пароль должен содержать хотя бы одну заглавную букву');
        process.exit(1);
    }
    
    if (!/[a-z]/.test(password)) {
        console.error('❌ Пароль должен содержать хотя бы одну строчную букву');
        process.exit(1);
    }
    
    if (!/[0-9]/.test(password)) {
        console.error('❌ Пароль должен содержать хотя бы одну цифру');
        process.exit(1);
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        console.error('❌ Пароль должен содержать хотя бы один специальный символ');
        process.exit(1);
    }
    
    try {
        // Читаем файл с пользователями
        const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        
        // Ищем пользователя admin
        const adminUser = usersData.users.find(user => user.username === 'admin');
        
        if (!adminUser) {
            console.error('❌ Пользователь admin не найден');
            process.exit(1);
        }
        
        // Хешируем новый пароль
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        
        // Обновляем пароль
        adminUser.password = hashedPassword;
        adminUser.updatedAt = new Date().toISOString();
        
        // Сохраняем изменения
        fs.writeFileSync(usersFilePath, JSON.stringify(usersData, null, 2));
        
        console.log('');
        console.log('✅ Пароль администратора успешно изменен!');
        console.log('');
        console.log('📋 ИНФОРМАЦИЯ:');
        console.log('   👤 Пользователь: admin');
        console.log('   🔑 Новый пароль: ' + '*'.repeat(password.length));
        console.log('   📅 Изменено: ' + new Date().toLocaleString());
        console.log('');
        console.log('⚠️  ВАЖНО:');
        console.log('   1. Сохраните новый пароль в надежном месте');
        console.log('   2. Не используйте этот пароль для других сервисов');
        console.log('   3. Регулярно меняйте пароли для безопасности');
        console.log('');
        console.log('🚀 Теперь вы можете войти в Контрольный центр с новым паролем:');
        console.log('   http://localhost:8080');
        console.log('');
        
        // Создаем резервную копию старого файла
        const backupPath = usersFilePath + '.backup-' + Date.now();
        fs.copyFileSync(usersFilePath, backupPath);
        console.log('💾 Создана резервная копия: ' + path.basename(backupPath));
        
    } catch (error) {
        console.error('❌ Ошибка при изменении пароля:', error.message);
        process.exit(1);
    }
}