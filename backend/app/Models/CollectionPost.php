<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionPost extends Model
{
    protected $fillable = [
        'collection_id',
        'post_id',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class, 'collection_id');
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}
