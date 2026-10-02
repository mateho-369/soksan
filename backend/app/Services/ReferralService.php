<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Phase 8 — referral (badge-only). Product rule: inviting friends earns a
 * badge and nothing else — no credits, no discounts, no ranking boost.
 */
class ReferralService
{
    /** Stable, unambiguous, human-friendly code. */
    public function generateCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (User::where('referral_code', $code)->exists());

        return $code;
    }

    /** Resolve an invite code (case-insensitive). Unknown codes are ignored
     * at signup — an invite link must never block account creation. */
    public function resolve(string $code): ?User
    {
        $code = trim(strtoupper($code));

        return $code === '' ? null : User::where('referral_code', $code)->first();
    }

    /** How many travelers joined with this user's code. */
    public function referredCount(User $user): int
    {
        return User::where('referred_by_user_id', $user->id)->count();
    }
}
