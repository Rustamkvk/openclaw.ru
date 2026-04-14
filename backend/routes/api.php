<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SystemController;
use App\Http\Controllers\Api\AgentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [UserController::class, 'updateProfile']);
    Route::get('/system/health', [SystemController::class, 'health']);
    Route::get('/system/metrics', [SystemController::class, 'metrics'])->middleware('role:admin');
    Route::get('/system/logs', [SystemController::class, 'logs'])->middleware('role:admin');
    Route::get('/users', [UserController::class, 'index'])->middleware('role:admin');
    Route::put('/users/{user}/role', [UserController::class, 'updateRole'])->middleware('role:admin');
    Route::put('/users/{user}/status', [UserController::class, 'updateStatus'])->middleware('role:admin');
});

Route::prefix('agent')->group(function () {
    Route::post('/heartbeat', [AgentController::class, 'heartbeat']);
    Route::post('/event', [AgentController::class, 'event']);
    Route::get('/poll', [AgentController::class, 'poll']);
    Route::get('/nodes', [AgentController::class, 'nodes']);
});
