<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category',
        'location_name',
        'province',
        'caption',
        'status',
        'latitude',
        'longitude',
        'commune_id',
        'district_id',
        'geo_province_id',
        'place_id',
        'safety_tags',
        'location_precision',
        'is_sensitive_location',
        'show_exact_location_to_owner_only',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            // Phase 9 — safety & accessibility tags arrive as a jsonb array.
            'safety_tags' => 'array',
            'location_precision' => 'integer',
            'is_sensitive_location' => 'boolean',
            'show_exact_location_to_owner_only' => 'boolean',
        ];
    }

    /**
     * Phase 0 hardening — coordinates rounded for public viewers. Sensitive
     * locations are capped at 2 decimals (~1.1km) whatever the author chose.
     */
    public function publicLatitude(): ?float
    {
        return $this->latitude === null ? null
            : round((float) $this->latitude, $this->publicPrecision());
    }

    public function publicLongitude(): ?float
    {
        return $this->longitude === null ? null
            : round((float) $this->longitude, $this->publicPrecision());
    }

    private function publicPrecision(): int
    {
        $precision = (int) ($this->location_precision ?? 4);

        return $this->is_sensitive_location ? min($precision, 2) : $precision;
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function geoProvince(): BelongsTo
    {
        return $this->belongsTo(Province::class, 'geo_province_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(Media::class)->orderBy('sort_order');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    /** Phase 0 hardening — community reports filed against this post. */
    public function reports(): MorphMany
    {
        return $this->morphMany(Report::class, 'reportable');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class);
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }
}
