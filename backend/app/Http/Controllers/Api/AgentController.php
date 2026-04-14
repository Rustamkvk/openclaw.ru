<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use App\Models\AgentEvent;
use App\Models\AgentNode;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    public function heartbeat(Request $request)
    {
        $validated = $request->validate([
            'node_name' => 'required|string|max:255',
            'node_type' => 'nullable|string|max:64',
            'meta' => 'nullable|array',
        ]);

        $node = AgentNode::firstOrCreate(
            ['name' => $validated['node_name']],
            ['node_type' => $validated['node_type'] ?? 'mac-mini']
        );

        $node->status = 'online';
        $node->last_ip = $request->ip();
        $node->last_seen_at = now();
        $node->meta = $validated['meta'] ?? null;
        $node->save();

        return response()->json(['message' => 'heartbeat accepted', 'node_id' => $node->id]);
    }

    public function event(Request $request)
    {
        $validated = $request->validate([
            'node_name' => 'required|string|max:255',
            'event_type' => 'required|string|max:128',
            'payload' => 'nullable|array',
            'occurred_at' => 'nullable|date',
        ]);

        $node = AgentNode::firstOrCreate(['name' => $validated['node_name']], ['node_type' => 'mac-mini']);

        AgentEvent::create([
            'agent_node_id' => $node->id,
            'event_type' => $validated['event_type'],
            'payload' => $validated['payload'] ?? null,
            'occurred_at' => $validated['occurred_at'] ?? now(),
        ]);

        ActivityLog::create([
            'user_id' => null,
            'action' => 'AGENT_EVENT',
            'details' => "node={$node->name}; type={$validated['event_type']}",
            'ip_address' => $request->ip(),
            'user_agent' => substr((string)$request->userAgent(), 0, 255),
        ]);

        return response()->json(['message' => 'event stored']);
    }

    public function poll(Request $request)
    {
        $request->validate([
            'node_name' => 'required|string|max:255',
        ]);

        // Placeholder for command queue, currently returns no queued commands.
        return response()->json([
            'commands' => [],
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function nodes()
    {
        $nodes = AgentNode::orderByDesc('last_seen_at')->get();
        return response()->json(['nodes' => $nodes]);
    }
}
