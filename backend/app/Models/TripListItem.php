<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripListItem extends Model
{
    protected $fillable = [
        'trip_list_id',
        'post_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(TripList::class, 'trip_list_id');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}
