<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Place;
use App\Models\User;

/**
 * Business registration rules (Phase 3). Reused by the user-facing API now
 * and by the admin approval queue in Phase 5 — approval lives HERE so the
 * audit log (Phase 5) wraps one code path.
 */
class BusinessService
{
    /**
     * Register a business. Production keeps it `pending` until an admin
     * approves; the owner gets the free Verified tier once approved.
     */
    public function register(User $owner, array $data): Business
    {
        $place = null;
        if (!empty($data['place_id'])) {
            $place = Place::query()->findOrFail($data['place_id']);
        }

        return Business::query()->create([
            'owner_id' => $owner->id,
            'name' => $data['name'],
            'name_kh' => $data['name_kh'] ?? null,
            'category' => $data['category'],
            'description' => $data['description'] ?? null,
            'phone' => $data['phone'] ?? null,
            'place_id' => $place?->id,
            'place_name' => $data['place_name'] ?? $place?->formatted_address,
            'tier' => Business::TIER_VERIFIED,
            'status' => Business::STATUS_PENDING,
        ]);
    }

    /**
     * Admin approval (called from the Phase 5 admin queue behind role:admin).
     */
    public function approve(Business $business, User $admin): Business
    {
        $business->update([
            'status' => Business::STATUS_APPROVED,
            'approved_by_user_id' => $admin->id,
            'approved_at' => now(),
        ]);

        return $business->refresh();
    }

    /**
     * Admin rejection (Phase 5).
     */
    public function reject(Business $business, User $admin): Business
    {
        $business->update([
            'status' => 'rejected',
            'approved_by_user_id' => $admin->id,
            'approved_at' => now(),
        ]);

        return $business->refresh();
    }
}
