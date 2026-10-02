<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Central safety gate for Redis access.
 *
 * Every Redis-backed feature is OPTIONAL: when Redis is unreachable the app
 * degrades gracefully to Postgres-only behaviour instead of failing requests.
 * All Redis code in this project must go through attempt(), never call the
 * facade directly from controllers/jobs.
 */
class RedisGate
{
    /** Cache of the last ping result so we do not ping on every request. */
    private static ?bool $available = null;
    private static float $checkedAt = 0.0;

    private const RECHECK_SECONDS = 5.0;

    public static function available(): bool
    {
        $now = microtime(true);

        if (self::$available !== null && ($now - self::$checkedAt) < self::RECHECK_SECONDS) {
            return self::$available;
        }

        try {
            Redis::connection()->ping();
            self::$available = true;
        } catch (Throwable) {
            self::$available = false;
        }

        self::$checkedAt = $now;

        return self::$available;
    }

    /**
     * Run $task against Redis. When Redis is down (or the task throws),
     * log once and return $fallback so callers keep working via Postgres.
     *
     * @template T
     *
     * @param  callable(): T  $task
     * @param  T  $fallback
     * @return T
     */
    public static function attempt(callable $task, mixed $fallback = null): mixed
    {
        if (! self::available()) {
            return $fallback;
        }

        try {
            return $task();
        } catch (Throwable $e) {
            self::$available = false;
            Log::warning('Redis unavailable, falling back: '.$e->getMessage());

            return $fallback;
        }
    }
}
