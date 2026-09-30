<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * Province leaderboard backed by a Redis sorted set.
 *
 * Member = province name (as stored on posts), score = activity points.
 * ZINCRBY on every new post gives instant movement; leaderboard:rebuild
 * recomputes absolute scores from Postgres so drift never accumulates.
 *
 * When Redis is down the HTTP endpoint answers from Postgres directly
 * (slower, but correct), so the feature never 500s.
 */
class LeaderboardService
{
    private const KEY = 'leaderboard:provinces';

    /** Instant +1 activity bump when a post is published. */
    public function bump(string $province, int $points = 1): void
    {
        RedisGate::attempt(function () use ($province, $points) {
            Redis::zincrby(self::KEY, $points, mb_strtolower(trim($province)));
        });
    }

    /**
     * Full recompute from Postgres — the scheduled drift-corrector.
     * Score = published posts + likes + comments for the province.
     */
    public function rebuild(): void
    {
        RedisGate::attempt(function () {
            $rows = Post::query()
                ->published()
                ->select('province')
                ->selectRaw('count(*) as posts_count')
                ->selectRaw('(select count(*) from likes where likes.post_id = posts.id) as likes_count')
                ->selectRaw('(select count(*) from comments where comments.post_id = posts.id) as comments_count')
                ->groupBy('province')
                ->get();

            Redis::del(self::KEY);

            foreach ($rows as $row) {
                $score = (int) $row->posts_count + (int) $row->likes_count + (int) $row->comments_count;
                Redis::zadd(self::KEY, $score, mb_strtolower(trim($row->province)));
            }
        });
    }

    /**
     * Top provinces by score. Falls back to a grouped Postgres query when
     * Redis is unavailable.
     *
     * @return array<int, array{province: string, score: int, rank: int}>
     */
    public function top(int $limit = 25): array
    {
        $cached = RedisGate::attempt(function () use ($limit) {
            $withScores = Redis::zrevrange(self::KEY, 0, $limit - 1, 'WITHSCORES');

            if ($withScores === [] || $withScores === null) {
                return null;
            }

            $rank = 0;

            return collect($withScores)
                ->map(fn ($score, $province) => [
                    'province' => $province,
                    'score' => (int) $score,
                    'rank' => ++$rank,
                ])
                ->values()
                ->all();
        });

        if ($cached !== null) {
            return $cached;
        }

        return Post::query()
            ->published()
            ->select('province')
            ->selectRaw('count(*) as score')
            ->groupBy('province')
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn ($row, $index) => [
                'province' => mb_strtolower(trim($row->province)),
                'score' => (int) $row->score,
                'rank' => $index + 1,
            ])
            ->values()
            ->all();
    }
}
