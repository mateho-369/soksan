<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerPlacement extends Model
{
    protected $fillable = [
        'business_name',
        'business_name_kh',
        'partner_type',
        'province',
        'phone',
        'telegram_url',
        'description',
        'avatar_url',
        'cover_url',
        'active',
        'starts_at',
        'ends_at',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
