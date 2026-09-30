<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use App\Models\WeeklyHiddenGem;
use Carbon\CarbonImmutable;

/**
 * Phase 5 — Hidden Gem of the Week. Editorial spotlight only; the pick
 * never changes a post's ranking score.
 */
class HiddenGemService
{
    public function __construct(private readonly AuditService $audit)
    {
    }

    /** The pick for the ISO week containing $now (or none yet). */
    public function current(?CarbonImmutable $now = null): ?WeeklyHiddenGem
    {
        $weekStart = ($now ?? CarbonImmutable::now())->startOfWeek();

        return WeeklyHiddenGem::query()
            ->where('week_start', $weekStart->toDateString())
            ->with('post')
            ->first();
    }

    /** Admin pick — one per week; picking again replaces and is audited. */
    public function pick(Post $post, User $admin, ?string $note = null): WeeklyHiddenGem
    {
        abort_unless($post->status === 'published', 422, 'Only published posts can be the Hidden Gem.');

        $weekStart = CarbonImmutable::now()->startOfWeek()->toDateString();

        $gem = WeeklyHiddenGem::query()->updateOrCreate(
            ['week_start' => $weekStart],
            [
                'post_id' => $post->id,
                'note' => $note,
                'picked_by_user_id' => $admin->id,
            ],
        );

        $this->audit->record($admin, 'hidden_gem.pick', $gem, ['post_id' => $post->id]);

        return $gem->load('post');
    }
}
