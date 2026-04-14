import DashboardStats from '@/components/dashboard-stats';
import ActiveSessions from '@/components/active-sessions';
import RecentTasks from '@/components/recent-tasks';
import SystemStatus from '@/components/system-status';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Контрольный центр</h1>
          <p className="text-gray-400 mt-2">
            Мониторинг и управление OpenClaw агентами и задачами
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-2 bg-green-900/30 text-green-400 rounded-lg border border-green-800">
            <span className="font-medium">Система активна</span>
          </div>
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition">
            Новая задача
          </button>
        </div>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ActiveSessions />
        </div>
        <div className="space-y-6">
          <RecentTasks />
          <SystemStatus />
        </div>
      </div>
    </div>
  );
}