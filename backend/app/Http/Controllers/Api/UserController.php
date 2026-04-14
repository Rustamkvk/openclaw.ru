<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('role')
            ->orderByDesc('id')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => optional($user->role)->slug,
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at,
                    'created_at' => $user->created_at,
                ];
            });

        return response()->json(['users' => $users]);
    }

    public function updateRole(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|string|in:admin,user',
        ]);

        $role = Role::where('slug', $validated['role'])->firstOrFail();
        $user->role_id = $role->id;
        $user->save();

        $this->log($request, $request->user()->id, 'USER_ROLE_UPDATED', "User {$user->id} => {$role->slug}");
        return response()->json(['message' => 'Роль обновлена']);
    }

    public function updateStatus(Request $request, User $user)
    {
        $validated = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        if ((int)$request->user()->id === (int)$user->id && !$validated['is_active']) {
            return response()->json(['message' => 'Нельзя деактивировать текущего пользователя'], 400);
        }

        $user->is_active = $validated['is_active'];
        $user->save();

        $this->log($request, $request->user()->id, 'USER_STATUS_UPDATED', "User {$user->id} => {$user->is_active}");
        return response()->json(['message' => 'Статус обновлен']);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $request->user()->id,
            'current_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:8',
        ]);

        $user = $request->user();

        if (!empty($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (!empty($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (!empty($validated['new_password'])) {
            if (empty($validated['current_password']) || !Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Текущий пароль неверный'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();
        $this->log($request, $user->id, 'PROFILE_UPDATED', 'Профиль обновлен');

        return response()->json(['message' => 'Профиль обновлен']);
    }

    private function log(Request $request, $userId, $action, $details)
    {
        ActivityLog::create([
            'user_id' => $userId,
            'action' => $action,
            'details' => $details,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string)$request->userAgent(), 0, 255),
        ]);
    }
}
