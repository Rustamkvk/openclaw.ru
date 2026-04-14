<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use App\Models\AgentNode;
use App\Models\User;
use App\Http\Controllers\Controller;

class SystemController extends Controller
{
    public function health()
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'counters' => [
                'users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'agents_online' => AgentNode::where('status', 'online')->count(),
                'logs' => ActivityLog::count(),
            ],
        ]);
    }

    public function logs()
    {
        $logs = ActivityLog::with('user:id,name,email')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['logs' => $logs]);
    }

    public function metrics()
    {
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        $onlineAgents = AgentNode::where('status', 'online')->count();
        $totalLogs = ActivityLog::count();

        $prometheus = [
            '# HELP openclaw_users_total Total users',
            '# TYPE openclaw_users_total gauge',
            "openclaw_users_total {$totalUsers}",
            '# HELP openclaw_users_active Active users',
            '# TYPE openclaw_users_active gauge',
            "openclaw_users_active {$activeUsers}",
            '# HELP openclaw_agents_online Online agents',
            '# TYPE openclaw_agents_online gauge',
            "openclaw_agents_online {$onlineAgents}",
            '# HELP openclaw_activity_logs_total Total activity logs',
            '# TYPE openclaw_activity_logs_total counter',
            "openclaw_activity_logs_total {$totalLogs}",
        ];

        return response(implode("\n", $prometheus) . "\n", 200)
            ->header('Content-Type', 'text/plain; version=0.0.4');
    }
}
