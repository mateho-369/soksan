<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Business extends Model
{
    public const TIER_VERIFIED = 'verified';

    public const TIER_BOOSTED = 'boosted';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    protected $fillable = [
        'owner_id',
        'name',
        'name_kh',
        'category',
        'description',
        'phone',
        'place_id',
        'place_name',
        'tier',
        'status',
        'approved_by_user_id',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function place(): BelongsTo
    {
        return $this->belongsTo(Place::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(BusinessSubscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(BusinessSubscription::class)
            ->where('status', BusinessSubscription::STATUS_ACTIVE)
            ->latestOfMany('paid_at');
    }

    public function isBoosted(): bool
    {
        return $this->tier === self::TIER_BOOSTED;
    }
}
