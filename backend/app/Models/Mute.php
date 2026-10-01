<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mute extends Model
{
    protected $fillable = ['user_id', 'muted_user_id', 'muted_until'];

    protected function casts(): array
    {
        return [
            'muted_until' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mutedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'muted_user_id');
    }
}
