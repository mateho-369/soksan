<?php

use Illuminate\Support\Facades\Route;

// The API is the product; this file only serves the health check
// (registered via `health: '/up'` in bootstrap/app.php).
Route::get('/', fn () => response()->json([
    'service' => 'SokSan Network API',
    'docs' => '/api/v1',
]));
