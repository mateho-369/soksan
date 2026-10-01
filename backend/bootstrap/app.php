<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Versioned JSON API: throttle everything under /api and stamp
        // security headers on every response (Phase 0 hardening).
        $middleware->appendToGroup('api', [
            'throttle:api',
            \App\Http\Middleware\EnsureSecurityHeaders::class,
        ]);

        // Role-based access control is available from day one; the admin
        // site will use `role:admin` routes later.
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // API clients always receive JSON — never HTML error pages or
        // stack traces (debug output stays controlled by APP_DEBUG).
        $exceptions->shouldRenderJsonWhen(
            fn ($request, $e) => $request->is('api/*') || $request->expectsJson()
        );
    })
    ->create();
