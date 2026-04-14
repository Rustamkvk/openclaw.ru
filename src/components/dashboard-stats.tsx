'use client';

import { Activity, Cpu, Database, Users } from 'lucide-react';

const stats = [
  {
    title: 'Активные сессии',
    value: '3',
    change: '+1',
    icon: <Activity className="w-6 h-6" />,
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    title: 'Задачи в работе',
    value: '12',
    change: '+3',
    icon: <Cpu className="w-6 h-6" />,
    color: 'bg-green-500/20 text-green-400',
  },
  {
    title: 'Записи памяти',
    value: '1.2K',
    change: '+42',
    icon: <Database className="w-6 h-6" />,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    title: 'Субагенты',
    value: '5',
    change: '0',
    icon: <Users className="w-6 h-6" />,
    color: 'bg-orange-500/20 text-orange-400',
  },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-gray-900/50 rounded-xl border border-gray-800 p-6"
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-lg ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.title}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center text-sm">
              <span className="text-green-400">{stat.change} за сегодня</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}