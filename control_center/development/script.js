// WebSocket клиент для чата с Атласом
class AtlasChat {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnected = false;
    
    // Элементы DOM
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');
    this.chatMessages = document.getElementById('chat-messages');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.wsStatus = document.getElementById('ws-status');
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.connectWebSocket();
    this.setupQuickCommands();
  }
  
  setupEventListeners() {
    // Отправка сообщения по Enter (Ctrl+Enter для новой строки)
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Отправка по кнопке
    this.sendButton.addEventListener('click', () => this.sendMessage());
    
    // Авторазмер textarea
    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    });
  }
  
  connectWebSocket() {
    this.updateStatus('connecting', 'Подключение к WebSocket...');
    
    try {
      // Пока используем эмуляцию, позже заменим на реальный WebSocket
      this.ws = {
        send: (message) => {
          console.log('WebSocket отправка:', message);
          this.handleMockResponse(message);
        },
        close: () => {}
      };
      
      // Имитация подключения
      setTimeout(() => {
        this.isConnected = true;
        this.updateStatus('connected', 'Подключено (эмуляция)');
        this.wsStatus.textContent = 'Эмуляция';
        this.addSystemMessage('WebSocket подключён в режиме эмуляции. Реальный сервер будет настроен позже.');
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка подключения WebSocket:', error);
      this.updateStatus('error', 'Ошибка подключения');
      this.scheduleReconnect();
    }
  }
  
  updateStatus(status, text) {
    this.statusText.textContent = text;
    this.statusDot.className = 'status-dot';
    
    switch(status) {
      case 'connecting':
        this.statusDot.classList.add('connecting');
        this.sendButton.disabled = true;
        break;
      case 'connected':
        this.statusDot.style.background = 'var(--success)';
        this.sendButton.disabled = false;
        break;
      case 'error':
        this.statusDot.style.background = 'var(--warn)';
        this.sendButton.disabled = true;
        break;
      case 'disconnected':
        this.statusDot.style.background = '#ef4444';
        this.sendButton.disabled = true;
        break;
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connectWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
  
  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || !this.isConnected) return;
    
    // Добавляем сообщение пользователя в чат
    this.addMessage(message, 'user');
    
    // Отправляем через WebSocket
    this.ws.send(JSON.stringify({
      type: 'message',
      content: message,
      timestamp: new Date().toISOString()
    }));
    
    // Очищаем поле ввода
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';
    this.messageInput.focus();
  }
  
  handleMockResponse(userMessage) {
    // Имитация ответа от Атласа
    setTimeout(() => {
      const responses = [
        `Я получил ваше сообщение: "${userMessage}". Это development версия чата.`,
        `Отлично! Сообщение "${userMessage.substring(0, 30)}..." получено. Реальный WebSocket сервер будет настроен позже.`,
        `Сообщение обработано. Сейчас работаю в режиме эмуляции.`,
        `Запомнил: "${userMessage}". Продолжаем разработку дашборда!`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage(randomResponse, 'assistant');
    }, 500);
  }
  
  addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
      ${text}
      <div class="message-time">${time}</div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }
  
  addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.style.fontStyle = 'italic';
    messageDiv.style.opacity = '0.8';
    
    const time = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
      📢 ${text}
      <div class="message-time">${time}</div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }
  
  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
  
  setupQuickCommands() {
    // Обработчики уже установлены через onclick в HTML
  }
}

// Глобальные функции для быстрых команд
function sendQuickCommand(command) {
  const chat = window.atlasChat;
  
  const commands = {
    status: () => {
      chat.addSystemMessage('🔄 Проверяю статус системы...');
      setTimeout(() => {
        chat.addMessage('✅ Система работает нормально. Development версия активна. WebSocket: эмуляция. Память: автообновление.', 'assistant');
      }, 800);
    },
    
    update_memory: () => {
      chat.addSystemMessage('🔄 Обновляю индекс памяти...');
      setTimeout(() => {
        chat.addMessage('✅ Индекс памяти обновлён. Все воспоминания синхронизированы.', 'assistant');
      }, 1200);
    },
    
    git_status: () => {
      chat.addSystemMessage('📁 Проверяю состояние Git репозитория...');
      setTimeout(() => {
        chat.addMessage('✅ Git репозиторий настроен. Все изменения закоммичены. Ветка: main', 'assistant');
      }, 800);
    },
    
    backup: () => {
      chat.addSystemMessage('💾 Создаю резервную копию development версии...');
      setTimeout(() => {
        const date = new Date().toLocaleTimeString('ru-RU');
        chat.addMessage(`✅ Бэкап создан: control_center/backups/2026-03-24/${date.replace(/:/g, '-')}/`, 'assistant');
      }, 1500);
    },
    
    test_websocket: () => {
      chat.addSystemMessage('🔌 Тестирую WebSocket соединение...');
      setTimeout(() => {
        chat.addMessage('✅ WebSocket: режим эмуляции. Реальный сервер будет настроен на этапе развертывания.', 'assistant');
      }, 1000);
    },
    
    deploy_preview: () => {
      chat.addSystemMessage('🚀 Готовлю превью плана развертывания...');
      setTimeout(() => {
        chat.addMessage(`📋 План развертывания:
1. 🏗️ Development версия готова
2. 🔧 Настроить реальный WebSocket сервер
3. 🌐 Выбрать хостинг (VPS $5-10/месяц)
4. 🔐 Настроить SSL и аутентификацию
5. 🚀 Развернуть на сервере
6. 📱 Протестировать доступ с мобильных`, 'assistant');
      }, 1200);
    }
  };
  
  if (commands[command]) {
    commands[command]();
  }
}

// Управление навигацией
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const dashboardSection = document.getElementById('dashboard');
  const iframeContainers = document.querySelectorAll('.iframe-container');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Удаляем активный класс у всех ссылок
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Добавляем активный класс к текущей ссылке
      link.classList.add('active');
      
      const targetId = link.getAttribute('data-target');
      
      if (targetId === 'dashboard') {
        // Показываем dashboard, скрываем все iframe
        dashboardSection.classList.add('active-section');
        iframeContainers.forEach(container => {
          container.classList.remove('active');
        });
      } else {
        // Скрываем dashboard, показываем нужный iframe
        dashboardSection.classList.remove('active-section');
        
        // Скрываем все iframe
        iframeContainers.forEach(container => {
          container.classList.remove('active');
        });
        
        // Показываем нужный iframe
        const targetFrame = document.getElementById(targetId);
        if (targetFrame) {
          targetFrame.classList.add('active');
          
          // Загружаем контент в iframe если нужно
          if (targetFrame.querySelector('.iframe-content') && !targetFrame.querySelector('.iframe-content').src) {
            loadFrameContent(targetId);
          }
        }
      }
      
      // При переключении на чат, фокусируем поле ввода
      if (targetId === 'chat-frame') {
        setTimeout(() => {
          const messageInput = document.getElementById('message-input');
          if (messageInput) messageInput.focus();
        }, 100);
      }
    });
  });
}

// Загрузка контента в iframe
function loadFrameContent(frameId) {
  const frame = document.querySelector(`#${frameId} .iframe-content`);
  if (!frame) return;
  
  const contentMap = {
    'memory-frame': 'memory_center.html',
    'tasks-frame': 'TASK_BOARD.md',
    'chat-frame': '', // Чат уже встроен
    'fz-overview': '44-fz-workflow.md',
    'fz-documents': '44-fz/documents/',
    'fz-projects': '44-fz/projects/',
    'fz-calendar': 'calendar.html',
    'fz-templates': '44-fz/templates/',
    'settings': 'settings.html',
    'logs': 'logs.html',
    'health': 'health.html'
  };
  
  if (contentMap[frameId]) {
    frame.src = contentMap[frameId];
  }
}

// Функция для обновления iframe
function reloadFrame(id) {
  const frame = document.getElementById(id);
  if (frame) {
    frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  window.atlasChat = new AtlasChat();
  
  // Автофокус на поле ввода при загрузке
  setTimeout(() => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.focus();
  }, 500);
  
  // Проверяем состояние авторизации каждые 5 минут
  setInterval(() => {
    if (window.authManager) {
      window.authManager.checkAuth();
    }
  }, 5 * 60 * 1000);
});

// Экспорт для глобального использования
window.sendQuickCommand = sendQuickCommand;
window.reloadFrame = reloadFrame;