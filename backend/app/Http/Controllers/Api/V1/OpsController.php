<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\RedisGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Basic monitoring hooks for the scaling plan (stage 2+). Admin-only.
 * Surfaces the four numbers the plan says to watch: queue depth, database
 * connections, error-free liveness, and response-time context.
 */
class OpsController extends Controller
{
    public function health(): JsonResponse
    {
        $checks = [
            'app' => true,
            'database' => $this->databaseOk(),
            'redis' => RedisGate::available(),
        ];

        $healthy = $checks['app'] && $checks['database'];

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    public function metrics(): JsonResponse
    {
        return response()->json([
            'redis' => [
                'available' => RedisGate::available(),
                'queue_depth_default' => $this->queueDepth('default'),
                'queue_depth_moderation' => $this->queueDepth('moderation'),
            ],
            'database' => [
                'connections_active' => $this->activeConnections(),
            ],
            'php' => [
                'memory_peak_mb' => round(memory_get_peak_usage(true) / 1048576, 1),
                'uptime_seconds' => time() - (int) ($_SERVER['REQUEST_TIME_FLOAT'] ?? time()),
            ],
        ]);
    }

    private function databaseOk(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    private function queueDepth(string $queue): ?int
    {
        return RedisGate::attempt(function () use ($queue) {
            $prefix = (string) config('queue.connections.redis.queue', 'default');

            // Laravel queues live at queues:{name}; delayed at queues:{name}:delayed.
            return (int) Redis::llen("queues:{$queue}")
                + (int) Redis::zcard("queues:{$queue}:delayed");
        });
    }

    private function activeConnections(): ?int
    {
        try {
            return count(DB::select('select 1 from pg_stat_activity'));
        } catch (Throwable) {
            return null;
        }
    }
}
