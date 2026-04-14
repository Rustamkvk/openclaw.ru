<?php

declare(strict_types=1);

// OSP entrypoint at project root.
// It forwards requests to the actual Laravel public directory in backend/public.
$backendPublic = dirname(__DIR__) . '/backend/public';

if (!is_dir($backendPublic)) {
    http_response_code(500);
    echo 'Backend public directory is missing.';
    exit;
}

chdir($backendPublic);
require $backendPublic . '/index.php';
