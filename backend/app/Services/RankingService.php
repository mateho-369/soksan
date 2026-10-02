<?php

namespace App\Services;

use App\Models\Commune;
use App\Models\District;
use App\Models\Post;
use App\Models\Province;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Geographic ranking with recency decay.
 *
 * THE FORMULA (transparent, tunable in one place):
 *   post score  = (1 + likes + 2*comments + shares + views/100) * 0.5 ^ (age_days / HALF_LIFE_DAYS)
 *   place score = sum of its posts' scores
 *   scores roll UP: commune -> district -> province -> national.
 *
 * Recency decay means engagement halves every 21 days, so an old viral post
 * cannot dominate forever — fresh activity visibly moves the ranks.
 *
 * Like the province leaderboard, Redis ZSETs are warmed by rankings:rebuild
 * and reads fall back to computing live from Postgres, so the feature works
 * with or without Redis.
 */
class RankingService
{
    public const HALF_LIFE_DAYS = 21;

    private const KEYS = [
        'communes' => 'rankings:communes',
        'districts' => 'rankings:districts',
        'provinces' => 'rankings:provinces',
    ];

    /** 0.5^(age/half-life): 1.0 today, 0.5 at 21 days, 0.25 at 42 days. */
    public function decayWeight(Carbon|string $createdAt, ?Carbon $now = null): float
    {
        $ageDays = max(0, ($now ?? Carbon::now())->diffInDays(Carbon::parse($createdAt)));

        return pow(0.5, $ageDays / self::HALF_LIFE_DAYS);
    }

    /**
     * Engagement score for one post. Counts may be preloaded (withCount)
     * or plain columns; both shapes are handled.
     */
    public function postScore(Post $post, ?Carbon $now = null): float
    {
        $likes = (int) ($post->likes_count ?? $post->like_count ?? 0);
        $comments = (int) ($post->comments_count ?? $post->comment_count ?? 0);
        $shares = (int) ($post->share_count ?? 0);
        $views = (int) ($post->view_count ?? 0);

        $engagement = 1 + $likes + (2 * $comments) + $shares + ($views / 100);

        return $engagement * $this->decayWeight($post->created_at, $now);
    }

    /**
     * Score every published post once, then aggregate per commune/district/
     * province. Single pass over posts — cheap even at high volume.
     *
     * @return array{communes: array<int,float>, districts: array<int,float>, provinces: array<int,float>}
     */
    public function computeScores(?Carbon $now = null): array
    {
        $communes = [];
        $districts = [];
        $provinces = [];

        Post::query()
            ->published()
            ->whereNotNull('commune_id')
            ->withCount(['likes', 'comments'])
            ->select('id', 'commune_id', 'district_id', 'geo_province_id', 'created_at', 'view_count')
            ->chunkById(500, function ($posts) use (&$communes, &$districts, &$provinces, $now) {
                foreach ($posts as $post) {
                    $score = $this->postScore($post, $now);

                    $communes[$post->commune_id] = ($communes[$post->commune_id] ?? 0) + $score;
                    if ($post->district_id !== null) {
                        $districts[$post->district_id] = ($districts[$post->district_id] ?? 0) + $score;
                    }
                    if ($post->geo_province_id !== null) {
                        $provinces[$post->geo_province_id] = ($provinces[$post->geo_province_id] ?? 0) + $score;
                    }
                }
            });

        return ['communes' => $communes, 'districts' => $districts, 'provinces' => $provinces];
    }

    /** Warm the Redis ZSETs (called by rankings:rebuild on a schedule). */
    public function rebuild(): void
    {
        RedisGate::attempt(function () {
            $scores = $this->computeScores();

            foreach (self::KEYS as $scope => $key) {
                Redis::del($key);

                foreach ($scores[$scope] as $id => $score) {
                    Redis::zadd($key, round($score, 4), (string) $id);
                }
            }
        });
    }

    /**
     * Ranked list for a scope: 'communes' | 'districts' | 'provinces'.
     * Reads Redis when warm; otherwise computes live from Postgres.
     *
     * @return array<int, array{id:int, name:string, name_kh:?string, score:float, rank:int}>
     */
    public function top(string $scope, int $limit = 25, ?int $provinceId = null): array
    {
        if (! array_key_exists($scope, self::KEYS)) {
            return [];
        }

        $cached = RedisGate::attempt(function () use ($scope, $limit, $provinceId) {
            // Province filtering needs metadata Redis does not store, so
            // filtered queries compute live for correctness.
            if ($provinceId !== null) {
                return null;
            }

            $rows = Redis::zrevrange(self::KEYS[$scope], 0, $limit - 1, 'WITHSCORES');

            return ($rows === null || $rows === []) ? null : $this->hydrate($scope, $rows);
        });

        if ($cached !== null) {
            return $cached;
        }

        return $this->computeLive($scope, $limit, $provinceId);
    }

    /** @param array<string, mixed> $rows member => score */
    private function hydrate(string $scope, array $rows): array
    {
        $ids = array_map('intval', array_keys($rows));
        $models = $this->modelFor($scope)::whereIn('id', $ids)->get()->keyBy('id');

        $rank = 0;
        $out = [];

        foreach ($rows as $id => $score) {
            $model = $models->get((int) $id);

            if (! $model) {
                continue;
            }

            $out[] = [
                'id' => $model->id,
                'name' => $model->name,
                'name_kh' => $model->name_kh,
                'score' => round((float) $score, 1),
                'rank' => ++$rank,
            ];
        }

        return $out;
    }

    /** @return array<int, array{id:int, name:string, name_kh:?string, score:float, rank:int}> */
    private function computeLive(string $scope, int $limit, ?int $provinceId): array
    {
        try {
            $scores = $this->computeScores()[$scope];
        } catch (\Throwable $e) {
            Log::warning('Ranking live compute failed: '.$e->getMessage());

            return [];
        }

        if ($provinceId !== null) {
            $scores = $this->filterByProvince($scope, $scores, $provinceId);
        }

        arsort($scores);

        $top = array_slice($scores, 0, $limit, true);
        $ids = array_map('intval', array_keys($top));
        $models = $this->modelFor($scope)::whereIn('id', $ids)->get()->keyBy('id');

        $rank = 0;
        $out = [];

        foreach ($top as $id => $score) {
            $model = $models->get((int) $id);

            if (! $model) {
                continue;
            }

            $out[] = [
                'id' => $model->id,
                'name' => $model->name,
                'name_kh' => $model->name_kh,
                'score' => round((float) $score, 1),
                'rank' => ++$rank,
            ];
        }

        return $out;
    }

    /** @param array<int, float> $scores */
    private function filterByProvince(string $scope, array $scores, int $provinceId): array
    {
        if ($scope === 'provinces') {
            return isset($scores[$provinceId]) ? [$provinceId => $scores[$provinceId]] : [];
        }

        if ($scope === 'districts') {
            $districtIds = District::where('province_id', $provinceId)->pluck('id')->all();

            return array_intersect_key($scores, array_flip($districtIds));
        }

        $communeIds = Commune::query()
            ->join('districts', 'districts.id', '=', 'communes.district_id')
            ->where('districts.province_id', $provinceId)
            ->pluck('communes.id')
            ->all();

        return array_intersect_key($scores, array_flip($communeIds));
    }

    private function modelFor(string $scope): string
    {
        return match ($scope) {
            'communes' => Commune::class,
            'districts' => District::class,
            default => Province::class,
        };
    }
}
