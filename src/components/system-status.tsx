'use client';

import { useState, useEffect } from 'react';
import { Server, Cpu, Database, Wifi } from 'lucide-react';

interface SystemStatus {
  openclaw: 'online' | 'offline' | 'checking';
  api: 'online' | 'offline' | 'checking';
  memory: 'available' | 'unavailable' | 'checking';
  github: 'connected' | 'disconnected' | 'checking';
}

export default function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    openclaw: 'checking',
    api: 'checking',
    memory: 'checking',
    github: 'checking',
  });

  const [lastChecked, setLastChecked] = useState<string>('');

  const checkStatus = async () => {
    const newStatus: SystemStatus = { ...status };
    
    try {
      // Проверка OpenClaw
      const openclawRes = await fetch('/api/system');
      newStatus.openclaw = openclawRes.ok ? 'online' : 'offline';
      
      // Проверка API
      const apiRes = await fetch('/api/health');
      newStatus.api = apiRes.ok ? 'online' : 'offline';
      
      // Проверка памяти
      const memoryRes = await fetch('/api/memory');
      newStatus.memory = memoryRes.ok ? 'available' : 'unavailable';
      
      // Проверка GitHub (упрощенная)
      newStatus.github = 'connected'; // Предполагаем, что подключен
      
    } catch (error) {
      newStatus.openclaw = 'offline';
      newStatus.api = 'offline';
      newStatus.memory = 'unavailable';
      newStatus.github = 'disconnected';
    }
    
    setStatus(newStatus);
    setLastChecked(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Проверка каждые 30 секунд
    return () => clearInterval(interval);
  }, []);

  const statusItems = [
    {
      key: 'openclaw' as const,
      label: 'OpenClaw Core',
      icon: <Server className="w-5 h-5" />,
      description: 'Основная система',
    },
    {
      key: 'api' as const,
      label: 'Dashboard API',
      icon: <Cpu className="w-5 h-5" />,
      description: 'Серверная часть',
    },
    {
      key: 'memory' as const,
      label: 'Память',
      icon: <Database className="w-5 h-5" />,
      description: 'Файлы памяти',
    },
    {
      key: 'github' as const,
      label: 'GitHub',
      icon: <Wifi className="w-5 h-5" />,
      description: 'Репозиторий',
    },
  ];

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'online':
      case 'available':
      case 'connected':
        return 'bg-green-900/30 text-green-400 border-green-800';
      case 'offline':
      case 'unavailable':
      case 'disconnected':
        return 'bg-red-900/30 text-red-400 border-red-800';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getStatusText = (statusValue: string) => {
    switch (statusValue) {
      case 'online':
        return 'В сети';
      case 'offline':
        return 'Отключен';
      case 'available':
        return 'Доступна';
      case 'unavailable':
        return 'Недоступна';
      case 'connected':
        return 'Подключен';
      case 'disconnected':
        return 'Отключен';
      case 'checking':
        return 'Проверка...';
      default:
        return statusValue;
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Статус системы</h2>
        <div className="flex items-center space-x-4">
          {lastChecked && (
            <span className="text-sm text-gray-400">
              Обновлено: {lastChecked}
            </span>
          )}
          <button
            onClick={checkStatus}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
          >
            Обновить
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {statusItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-gray-800">
                {item.icon}
              </div>
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-gray-400">{item.description}</div>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full border ${getStatusColor(status[item.key])}`}>
              {getStatusText(status[item.key])}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Система работает нормально</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Требуется внимание</span>
          </div>
        </div>
      </div>
    </div>
  );
}