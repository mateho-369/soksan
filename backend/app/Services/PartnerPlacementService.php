<?php

namespace App\Services;

use App\Models\PartnerPlacement;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Phase 4 — partner placements with admin date ranges.
 *
 * Visibility rule (single source of truth): a placement is public only
 * while active AND inside its date window. Placements NEVER affect organic
 * ranking and are ALWAYS labeled "ដៃគូ / Partner" in the UI.
 */
class PartnerPlacementService
{
    /** Placements visible to the public right now. */
    public function activeAt(?CarbonImmutable $now = null): Collection
    {
        $now ??= CarbonImmutable::now();

        return PartnerPlacement::query()
            ->where('active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', $now);
            })
            ->orderBy('id')
            ->get();
    }
}
