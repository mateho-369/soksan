<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Media extends Model
{
    protected $table = 'media';

    protected $fillable = [
        'post_id',
        'url',
        'type',
        'sort_order',
        'duration_seconds',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'duration_seconds' => 'integer',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}
