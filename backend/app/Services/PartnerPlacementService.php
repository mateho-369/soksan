<?php

namespace App\Services;

use App\Models\PartnerPlacement;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Phase 4/5 — partner placements with admin date ranges.
 *
 * Visibility rule (single source of truth): a placement is public only
 * while active AND inside its date window. Placements NEVER affect organic
 * ranking and are ALWAYS labeled "ដៃគូ / Partner" in the UI. Scheduling is
 * an admin action and is audited.
 */
class PartnerPlacementService
{
    public function __construct(private readonly AuditService $audit)
    {
    }

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

    /** Admin: schedule a placement (date range optional, open-ended OK). */
    public function schedule(User $admin, array $data): PartnerPlacement
    {
        $placement = PartnerPlacement::query()->create($data + ['created_by_user_id' => $admin->id]);
        $this->audit->record($admin, 'placement.schedule', $placement);

        return $placement;
    }

    /** Admin: update window/active flag. */
    public function update(User $admin, PartnerPlacement $placement, array $data): PartnerPlacement
    {
        $placement->update($data);
        $this->audit->record($admin, 'placement.update', $placement, $data);

        return $placement->refresh();
    }
}
