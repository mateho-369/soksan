<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Place extends Model
{
    public const SOURCE_GOOGLE = 'google_places';

    public const SOURCE_MANUAL = 'manual';

    protected $fillable = [
        'source',
        'place_id',
        'name',
        'formatted_address',
        'lat',
        'lng',
        'confirmed_by_user_id',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'confirmed_at' => 'datetime',
        ];
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by_user_id');
    }
}
