<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/legacy/{path}', function ($path) {
    $projectRoot = realpath(base_path('..'));
    $candidate = realpath(base_path('../' . $path));

    if (!$projectRoot || !$candidate || strpos($candidate, $projectRoot) !== 0 || !File::exists($candidate) || !File::isFile($candidate)) {
        abort(404);
    }

    return response()->file($candidate);
})->where('path', '.*');

Route::get('/{path?}', function ($path = null) {
    $distPath = base_path('../frontend/dist');
    $requestedPath = $path ? $distPath . DIRECTORY_SEPARATOR . $path : null;

    // Serve built frontend static files directly.
    if ($requestedPath && File::exists($requestedPath) && File::isFile($requestedPath)) {
        return response()->file($requestedPath);
    }

    $indexFile = $distPath . DIRECTORY_SEPARATOR . 'index.html';
    if (File::exists($indexFile)) {
        return response()->file($indexFile);
    }

    return response('Frontend build not found. Run: cd frontend && npm run build', 500);
})->where('path', '^(?!api).*$');
