<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Atomic counters the way big social apps do it.
 *
 * Views are the write-heaviest counter (every clip play) and have no row of
 * their own, so they live entirely in Redis (INCR views:{post}) until the
 * counters:flush command batch-applies the deltas to posts.view_count.
 *
 * Likes and comments already have authoritative rows (likes / comments
 * tables), so Postgres stays the source of truth for them; Redis keeps
 * best-effort mirrors (likes:{post}, comments:{post}) that can be read in
 * O(1) for hot lists without touching the DB.
 *
 * When Redis is down: view increments apply straight to the column, likes
 * and comments keep working through their rows — nothing breaks.
 */
class CounterService
{
    private const REGISTRY = 'counters:pending';

    public function registerView(int $postId): void
    {
        $applied = RedisGate::attempt(function () use ($postId) {
            Redis::incr("views:{$postId}");
            Redis::sadd(self::REGISTRY, (string) $postId);

            return true;
        }, false);

        if (! $applied) {
            try {
                Post::whereKey($postId)->increment('view_count');
            } catch (Throwable $e) {
                Log::warning("View counter lost for post {$postId}: {$e->getMessage()}");
            }
        }
    }

    /** Best-effort O(1) mirrors; Postgres rows remain the source of truth. */
    public function mirrorLike(int $postId, int $delta): void
    {
        RedisGate::attempt(function () use ($postId, $delta) {
            Redis::incrby("likes:{$postId}", $delta);
        });
    }

    public function mirrorComment(int $postId, int $delta): void
    {
        RedisGate::attempt(function () use ($postId, $delta) {
            Redis::incrby("comments:{$postId}", $delta);
        });
    }

    /** @return int|null Mirror value when Redis is up, otherwise null. */
    public function mirror(string $type, int $postId): ?int
    {
        return RedisGate::attempt(function () use ($type, $postId) {
            $value = Redis::get("{$type}:{$postId}");

            return $value === null ? null : (int) $value;
        });
    }

    /**
     * Batch-flush pending view deltas to Postgres in one transaction.
     * Safe to run repeatedly (idempotent per delta) and cheap: one round
     * trip per dirty post, guarded with GETSET so concurrent flushes never
     * double-apply.
     *
     * @return int Number of posts updated.
     */
    public function flush(): int
    {
        return (int) RedisGate::attempt(function () {
            $pending = Redis::smembers(self::REGISTRY);
            $updated = 0;

            DB::transaction(function () use ($pending, &$updated) {
                foreach ($pending as $postId) {
                    // Take the delta atomically; a concurrent increment
                    // starts a fresh counter instead of being lost.
                    $delta = (int) Redis::getset("views:{$postId}", 0);

                    if ($delta === 0) {
                        Redis::srem(self::REGISTRY, (string) $postId);

                        continue;
                    }

                    Post::whereKey((int) $postId)->increment('view_count', $delta);
                    Redis::srem(self::REGISTRY, (string) $postId);
                    $updated++;
                }
            });

            return $updated;
        }, 0);
    }
}
