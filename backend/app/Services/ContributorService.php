<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;

/**
 * Phase 7 — contributor levels & badges.
 *
 * THE FORMULA (transparent, tunable in one place, quality-not-quantity):
 *   quality_points = Σ over the user's PUBLISHED posts of
 *       likes*1 + comments*3 + shares*2 + views/50
 *
 * Comments weigh most (real conversation), then shares (advocacy), likes,
 * then a small view term. Levels are floors on quality_points; badges are
 * milestone facts. Nothing here writes — levels are always derived live,
 * so they can never be gamed by stale stored counters, and they never
 * touch ranking, placement or moderation.
 */
class ContributorService
{
    public const LEVELS = [
        ['floor' => 0,    'key' => 'seedling',    'label' => 'Seedling'],
        ['floor' => 50,   'key' => 'explorer',    'label' => 'Explorer'],
        ['floor' => 200,  'key' => 'local_guide', 'label' => 'Local Guide'],
        ['floor' => 600,  'key' => 'storyteller', 'label' => 'Storyteller'],
        ['floor' => 1500, 'key' => 'ambassador',  'label' => 'Ambassador'],
    ];

    public function __construct(private readonly ReferralService $referrals)
    {
    }

    public function qualityPoints(User $user): float
    {
        return Post::query()
            ->published()
            ->where('profile_id', $user->id)
            ->get()
            ->sum(function (Post $post): float {
                return $post->like_count
                    + 3 * $post->comment_count
                    + 2 * $post->share_count
                    + ($post->view_count ?? 0) / 50;
            });
    }

    /** @return array{floor: int, key: string, label: string} */
    public function levelFor(float $points): array
    {
        $level = self::LEVELS[0];
        foreach (self::LEVELS as $candidate) {
            if ($points >= $candidate['floor']) {
                $level = $candidate;
            }
        }

        return $level;
    }

    /** @return array{floor: int, key: string, label: string}|null */
    public function nextLevelFor(float $points): ?array
    {
        foreach (self::LEVELS as $candidate) {
            if ($points < $candidate['floor']) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Milestone badges — facts about what the contributor has done.
     *
     * @return list<string> badge keys
     */
    public function badges(User $user): array
    {
        $published = Post::query()->published()->where('profile_id', $user->id)->get();
        $likesReceived = $published->sum('like_count');

        $badges = [];
        if ($published->count() >= 1) {
            $badges[] = 'first_story';
        }
        if ($published->count() >= 10) {
            $badges[] = 'prolific';
        }
        if ($likesReceived >= 100) {
            $badges[] = 'beloved';
        }
        if ($published->sum('share_count') >= 50) {
            $badges[] = 'word_spreader';
        }
        // Phase 8 — badge-only referral: inviting a friend earns this and
        // nothing else (no credits, no discounts, no ranking boost).
        if ($this->referrals->referredCount($user) >= 1) {
            $badges[] = 'welcomer';
        }

        return $badges;
    }

    /** Full public summary for API responses. */
    public function summary(User $user): array
    {
        $points = $this->qualityPoints($user);

        return [
            'quality_points' => round($points, 1),
            'level' => $this->levelFor($points),
            'next_level' => $this->nextLevelFor($points),
            'badges' => $this->badges($user),
            'referral_code' => $user->referral_code,
            'referred_signups' => $this->referrals->referredCount($user),
            'formula' => 'points = likes*1 + comments*3 + shares*2 + views/50, over published posts',
        ];
    }
}
