'use client';

import { CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';

const tasks = [
  {
    id: '44-fz-001',
    title: 'Анализ товаров 44-ФЗ',
    description: 'Поиск эквивалентов для закупки',
    status: 'completed',
    progress: 100,
    time: '2 часа назад',
    agent: 'Конвейер 44-ФЗ',
  },
  {
    id: 'memory-001',
    title: 'Обновление индекса памяти',
    description: 'Автоматическое обновление memory_index.json',
    status: 'running',
    progress: 75,
    time: '15 минут назад',
    agent: 'Системный агент',
  },
  {
    id: 'github-001',
    title: 'Настройка репозитория',
    description: 'Создание и настройка openclaw.ru',
    status: 'pending',
    progress: 0,
    time: 'Только что',
    agent: 'Атлас',
  },
  {
    id: 'telegram-001',
    title: 'Мониторинг Telegram',
    description: 'Проверка новых сообщений',
    status: 'completed',
    progress: 100,
    time: '1 час назад',
    agent: 'Telegram бот',
  },
];

export default function RecentTasks() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/30 text-green-400';
      case 'running':
        return 'bg-blue-900/30 text-blue-400';
      case 'pending':
        return 'bg-yellow-900/30 text-yellow-400';
      default:
        return 'bg-gray-800 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Последние задачи</h2>
        <button className="text-sm text-primary-400 hover:text-primary-300 transition">
          Показать все
        </button>
      </div>
      
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(task.status)}
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-gray-400">{task.description}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}`}>
                {task.status === 'completed' ? 'Завершено' : 
                 task.status === 'running' ? 'Выполняется' : 'Ожидание'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Прогресс</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'running' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm pt-2">
                <div className="flex items-center space-x-4">
                  <div className="text-gray-400">
                    <span className="font-medium">{task.agent}</span>
                  </div>
                  <div className="text-gray-500">
                    {task.time}
                  </div>
                </div>
                <button className="text-primary-400 hover:text-primary-300 text-sm">
                  Детали
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition flex items-center justify-center space-x-2">
          <Play className="w-4 h-4" />
          <span>Запустить новую задачу</span>
        </button>
      </div>
    </div>
  );
}