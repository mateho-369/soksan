<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessSubscription extends Model
{
    public const STATUS_PENDING = 'pending_payment';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'business_id',
        'status',
        'amount_usd',
        'currency',
        'invoice_ref',
        'bakong_transaction_id',
        'paid_at',
        'starts_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_usd' => 'float',
            'paid_at' => 'datetime',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
