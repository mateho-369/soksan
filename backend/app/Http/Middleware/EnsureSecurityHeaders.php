<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Phase 0 hardening — security headers for every API response.
 *
 * The static frontend sets the same headers at the CDN/web server
 * (public/_headers, deploy/nginx.conf.example); this middleware covers the
 * API surface so responses carry them no matter how Laravel is exposed.
 */
class EnsureSecurityHeaders
{
    /**
     * Paths whose responses must never be cached by browsers or shared
     * caches (credentials, identities, uploads, admin state).
     */
    private const NO_CACHE_PATTERNS = [
        'api/v1/auth/',
        'api/v1/me',
        'api/v1/uploads',
        'api/v1/notifications',
        'api/v1/admin/',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');

        // HSTS only makes sense behind TLS; never send it from dev servers.
        if (app()->environment('production')) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        if ($this->isSensitive($request)) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }

    private function isSensitive(Request $request): bool
    {
        $path = trim($request->path(), '/');

        foreach (self::NO_CACHE_PATTERNS as $pattern) {
            if ($path === rtrim($pattern, '/') || str_starts_with($path, $pattern)) {
                return true;
            }
        }

        return false;
    }
}
