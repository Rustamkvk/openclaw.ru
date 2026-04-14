<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::with('role')
            ->where('email', $credentials['login'])
            ->orWhere('name', $credentials['login'])
            ->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Неверные учетные данные.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Пользователь деактивирован'], 403);
        }

        $user->last_login_at = now();
        $user->save();

        $token = $user->createToken('web-token')->plainTextToken;
        $this->log($request, $user->id, 'AUTH_LOGIN', 'Успешный вход');

        return response()->json([
            'token' => $token,
            'user' => $this->serializeUser($user),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('role');
        return response()->json(['user' => $this->serializeUser($user)]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $this->log($request, $user->id, 'AUTH_LOGOUT', 'Выход из системы');

        return response()->json(['message' => 'Сессия завершена']);
    }

    private function serializeUser(User $user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ? $user->role->slug : null,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at,
        ];
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
