<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;

/**
 * Pre-computed feed pages for ANONYMOUS visitors (the biggest audience on a
 * travel network). Authenticated feeds stay live because they carry
 * per-viewer flags (is_liked / is_saved).
 *
 * Invalidation strategy (plain language):
 *  - Every cached page is short-lived on purpose (FEED_CACHE_TTL, default
 *    60 seconds). Worst case a new post shows up one minute late.
 *  - On top of that, creating/deleting a post or adding a comment deletes
 *    the cached pages immediately: keys are tracked in a registry set
 *    (feed:v1:keys) so invalidation is exact — no KEYS/SCAN wildcards.
 *  - When Redis is down, nothing is cached and the feed comes straight from
 *    Postgres, exactly like before Redis existed.
 *
 * Key shape: feed:v1:{category|all}:{province|all}:{searchHash|none}:{page}
 */
class FeedCacheService
{
    private const REGISTRY = 'feed:v1:keys';

    public function ttl(): int
    {
        return max(10, (int) env('FEED_CACHE_TTL', 60));
    }

    public function key(?string $category, ?string $province, ?string $search, int $page): string
    {
        $searchPart = $search === null || $search === ''
            ? 'none'
            : substr(sha1(mb_strtolower(trim($search))), 0, 12);

        return sprintf(
            'feed:v1:%s:%s:%s:%d',
            $category ?: 'all',
            $province ?: 'all',
            $searchPart,
            $page,
        );
    }

    /** @return array|null Cached resource array, or null on miss / Redis down. */
    public function get(?string $category, ?string $province, ?string $search, int $page): ?array
    {
        return RedisGate::attempt(function () use ($category, $province, $search, $page) {
            $raw = Redis::get($this->key($category, $province, $search, $page));

            return $raw === null ? null : json_decode($raw, true);
        });
    }

    public function put(?string $category, ?string $province, ?string $search, int $page, array $payload): void
    {
        RedisGate::attempt(function () use ($category, $province, $search, $page, $payload) {
            $key = $this->key($category, $province, $search, $page);
            Redis::setex($key, $this->ttl(), json_encode($payload));
            Redis::sadd(self::REGISTRY, $key);
        });
    }

    /**
     * Drop every cached feed page. Called on post create/delete and on new
     * comments. Bounded and exact thanks to the registry set.
     */
    public function invalidate(?string $province = null): void
    {
        RedisGate::attempt(function () use ($province) {
            $keys = Redis::smembers(self::REGISTRY);

            if ($keys === [] ) {
                return;
            }

            // Province scoping keeps unrelated regions warm while the
            // province that changed reloads fresh.
            if ($province !== null) {
                $needle = ':'.strtolower($province).':';
                $keys = array_values(array_filter(
                    $keys,
                    fn (string $key) => str_contains(strtolower($key), $needle),
                ));
            }

            if ($keys !== []) {
                Redis::del(...$keys);
                Redis::srem(self::REGISTRY, ...$keys);
            }
        });
    }
}
