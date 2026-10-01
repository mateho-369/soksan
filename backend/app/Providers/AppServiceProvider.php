<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // General API traffic.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Credential endpoints get a much tighter budget (brute-force defence).
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // ---- Phase 0 hardening: per-action limits -------------------------
        // Accounts younger than 48h get half the budget on write actions —
        // cheap abuse containment without touching legitimate users.
        $freshAccount = function (Request $request): bool {
            $user = $request->user();

            return $user !== null && $user->created_at !== null
                && $user->created_at->gt(now()->subHours(48));
        };

        // Creating posts is the most expensive write (media + geo + feed
        // cache invalidation).
        RateLimiter::for('posts', function (Request $request) use ($freshAccount) {
            $limit = $freshAccount($request) ? 5 : 10;

            return Limit::perMinute($limit)->by($request->user()?->id ?: $request->ip());
        });

        // Comments, likes, bookmarks, follows.
        RateLimiter::for('social', function (Request $request) use ($freshAccount) {
            $limit = $freshAccount($request) ? 15 : 30;

            return Limit::perMinute($limit)->by($request->user()?->id ?: $request->ip());
        });

        // Uploads are capped hard — each one costs storage + processing.
        RateLimiter::for('uploads', function (Request $request) use ($freshAccount) {
            $limit = $freshAccount($request) ? 3 : 5;

            return Limit::perMinute($limit)->by($request->user()?->id ?: $request->ip());
        });

        // Reports: enough to flag abuse, not enough to weaponise the queue.
        RateLimiter::for('reports', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        // Password reset + email verification send real mail; keep tight.
        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('verification', function (Request $request) {
            return Limit::perMinute(6)->by($request->user()?->id ?: $request->ip());
        });
    }
}
