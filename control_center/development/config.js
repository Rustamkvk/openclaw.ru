// Конфигурация для продакшн сервера
const config = {
  // Настройки сервера
  server: {
    port: 8082,
    host: '0.0.0.0', // Принимать подключения со всех интерфейсов
    publicUrl: 'http://91.213.23.189:8082'
  },
  
  // Настройки API сервера
  api: {
    port: 3001,
    host: 'localhost',
    cors: {
      origin: ['http://91.213.23.189:8082', 'http://localhost:8082'],
      credentials: true
    }
  },
  
  // Настройки WebSocket
  websocket: {
    port: 8081,
    host: '0.0.0.0'
  },
  
  // Настройки базы данных MySQL
  database: {
    host: 'localhost',
    port: 3306,
    database: 'openclaw_bd',
    user: 'openclaw_user',
    password: 'Admin123!', // TODO: Заменить на безопасный пароль
    charset: 'utf8mb4',
    timezone: '+03:00', // Москва
    connectionLimit: 10,
    waitForConnections: true,
    debug: false
  },
  
  // Настройки аутентификации
  auth: {
    secret: 'your_super_secret_jwt_key_change_this_for_production',
    expiresIn: '24h',
    cookieName: 'atlas_auth_token',
    cookieOptions: {
      httpOnly: true,
      secure: false, // TODO: Включить true при использовании HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
  },
  
  // Настройки приложения
  app: {
    name: 'Контрольный центр Атласа',
    version: '1.0.0',
    environment: 'production',
    debug: false,
    logLevel: 'info'
  },
  
  // Настройки памяти
  memory: {
    indexPath: '/Volumes/openclaw.ru/control_center/development/memory_index.json',
    updateInterval: 15 * 60 * 1000, // 15 минут
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },
  
  // Настройки безопасности
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 минут
      max: 100 // лимит запросов с одного IP
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws://91.213.23.189:8081"]
        }
      }
    }
  },
  
  // Настройки логирования
  logging: {
    directory: '/Volumes/openclaw.ru/control_center/development/logs',
    files: {
      http: 'http-server.log',
      auth: 'auth-server.log',
      websocket: 'websocket-server.log',
      error: 'error.log',
      access: 'access.log'
    },
    rotation: {
      size: '10m',
      interval: '1d',
      compress: true,
      maxFiles: 7
    }
  },
  
  // Настройки резервного копирования
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // Ежедневно в 2:00
    directory: '/Volumes/openclaw.ru/control_center/backups',
    retention: 7, // Хранить 7 дней
    includeDatabase: true,
    includeFiles: true
  },
  
  // Настройки email (для уведомлений)
  email: {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    from: 'noreply@openclaw.ru'
  },
  
  // Настройки мониторинга
  monitoring: {
    enabled: true,
    uptimeCheck: true,
    memoryCheck: true,
    diskSpaceCheck: true,
    alertThreshold: 80 // Процент использования
  }
};

// Экспорт конфигурации
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
  window.ATLAS_CONFIG = config;
}