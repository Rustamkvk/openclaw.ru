'use client';

import { MessageSquare, Cpu, Zap } from 'lucide-react';

const sessions = [
  {
    id: 'main',
    name: 'Основная сессия',
    model: 'DeepSeek Chat',
    status: 'active',
    lastActivity: '2 мин назад',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'bg-blue-500',
  },
  {
    id: '44-fz-pipeline',
    name: 'Конвейер 44-ФЗ',
    model: 'GPT-4o + DeepSeek',
    status: 'running',
    lastActivity: '5 мин назад',
    icon: <Cpu className="w-5 h-5" />,
    color: 'bg-green-500',
  },
  {
    id: 'control-ui',
    name: 'Интерфейс управления',
    model: 'DeepSeek Chat',
    status: 'active',
    lastActivity: 'Только что',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-purple-500',
  },
];

export default function ActiveSessions() {
  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Активные сессии</h2>
        <button className="text-sm text-primary-400 hover:text-primary-300 transition">
          Показать все
        </button>
      </div>
      
      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${session.color} bg-opacity-20`}>
                <div className={session.color.replace('bg-', 'text-')}>
                  {session.icon}
                </div>
              </div>
              <div>
                <div className="font-medium">{session.name}</div>
                <div className="text-sm text-gray-400">{session.model}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Последняя активность</div>
                <div className="font-medium">{session.lastActivity}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                session.status === 'active' 
                  ? 'bg-green-900/30 text-green-400 border border-green-800'
                  : 'bg-blue-900/30 text-blue-400 border border-blue-800'
              }`}>
                {session.status === 'active' ? 'Активна' : 'Выполняется'}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button className="w-full py-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition font-medium">
          + Запустить новую сессию
        </button>
      </div>
    </div>
  );
}