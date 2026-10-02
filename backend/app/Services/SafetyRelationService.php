<?php

namespace App\Services;

use App\Models\Block;
use App\Models\Mute;
use App\Models\User;

/**
 * Phase 0 hardening — blocks and mutes.
 *
 * Blocking is bidirectional in effect: while a block exists in EITHER
 * direction, the two users cannot follow or comment on each other's
 * content. Muting is one-directional and only hides the muted user's
 * posts from the muter's feed.
 */
class SafetyRelationService
{
    public function block(User $user, User $target): Block
    {
        abort_if($user->id === $target->id, 422, 'You cannot block yourself.');

        return Block::firstOrCreate([
            'user_id' => $user->id,
            'blocked_user_id' => $target->id,
        ]);
    }

    public function unblock(User $user, User $target): void
    {
        Block::where('user_id', $user->id)
            ->where('blocked_user_id', $target->id)
            ->delete();
    }

    public function mute(User $user, User $target, ?\DateTimeInterface $until = null): Mute
    {
        abort_if($user->id === $target->id, 422, 'You cannot mute yourself.');

        $mute = Mute::firstOrCreate([
            'user_id' => $user->id,
            'muted_user_id' => $target->id,
        ]);

        if ($until !== null) {
            $mute->update(['muted_until' => $until]);
        }

        return $mute;
    }

    public function unmute(User $user, User $target): void
    {
        Mute::where('user_id', $user->id)
            ->where('muted_user_id', $target->id)
            ->delete();
    }

    /** True when a block exists in either direction. */
    public function blockedBetween(int $a, int $b): bool
    {
        return Block::where(function ($query) use ($a, $b) {
            $query->where('user_id', $a)->where('blocked_user_id', $b);
        })->orWhere(function ($query) use ($a, $b) {
            $query->where('user_id', $b)->where('blocked_user_id', $a);
        })->exists();
    }

    /** Ids the given user currently mutes (feed filtering). */
    public function mutedIds(User $user): array
    {
        return Mute::where('user_id', $user->id)
            ->where(function ($query) {
                $query->whereNull('muted_until')->orWhere('muted_until', '>', now());
            })
            ->pluck('muted_user_id')
            ->all();
    }
}
