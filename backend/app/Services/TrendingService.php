<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Phase 6 — "Trending Now". Same engagement weighting as the geographic
 * rankings, but with a MUCH shorter half-life (3 days vs 21) so it answers
 * "what is hot right now" instead of "what is the best place overall".
 *
 * TRENDING FORMULA (transparent, tunable in one place):
 *   score = (1 + likes + 2*comments + shares + views/100) * 0.5 ^ (age_days / TRENDING_HALF_LIFE_DAYS)
 *
 * Guard rails:
 *  - only PUBLISHED posts are eligible (moderation pipeline respected);
 *  - only posts younger than TRENDING_WINDOW_DAYS enter the list, so a dead
 *    week can't surface month-old content as "trending";
 *  - trending never writes anything: it is a read-only view over posts, so
 *    organic ranking and partner placements are untouched.
 */
class TrendingService
{
    public const TRENDING_HALF_LIFE_DAYS = 3;

    public const TRENDING_WINDOW_DAYS = 14;

    public function __construct(private readonly RankingService $ranking)
    {
    }

    /** 0.5^(age/3): 1.0 today, 0.5 at 3 days, 0.125 at 9 days. */
    public function trendWeight(Carbon|string $createdAt, ?Carbon $now = null): float
    {
        $ageDays = max(0, ($now ?? Carbon::now())->diffInDays(Carbon::parse($createdAt)));

        return pow(0.5, $ageDays / self::TRENDING_HALF_LIFE_DAYS);
    }

    public function trendScore(Post $post, ?Carbon $now = null): float
    {
        $likes = (int) ($post->likes_count ?? $post->like_count ?? 0);
        $comments = (int) ($post->comments_count ?? $post->comment_count ?? 0);
        $shares = (int) ($post->share_count ?? 0);
        $views = (int) ($post->view_count ?? 0);

        $engagement = 1 + $likes + (2 * $comments) + $shares + ($views / 100);

        return $engagement * $this->trendWeight($post->created_at, $now);
    }

    /**
     * Top published posts inside the trending window, hottest first.
     *
     * @return Collection<int, Post>
     */
    public function trending(int $limit = 10, ?Carbon $now = null): Collection
    {
        $now ??= Carbon::now();
        $windowStart = $now->copy()->subDays(self::TRENDING_WINDOW_DAYS);

        return Post::query()
            ->published()
            ->where('created_at', '>=', $windowStart)
            ->get()
            ->map(fn (Post $post) => ['post' => $post, 'score' => $this->trendScore($post, $now)])
            ->sortByDesc('score')
            ->take($limit)
            ->pluck('post')
            ->values();
    }
}
