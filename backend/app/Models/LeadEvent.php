<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadEvent extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_CALL = 'call';

    public const TYPE_MESSAGE = 'message';

    public const TYPE_DIRECTIONS = 'directions';

    public const TYPES = [self::TYPE_CALL, self::TYPE_MESSAGE, self::TYPE_DIRECTIONS];

    protected $fillable = [
        'business_id',
        'event_type',
        'user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
