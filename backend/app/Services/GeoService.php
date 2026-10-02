<?php

namespace App\Services;

use App\Models\Commune;
use App\Models\Post;
use Illuminate\Validation\ValidationException;

/**
 * Geography derivation. Users tag a place to its COMMUNE only; district,
 * province and country are derived automatically. This keeps data entry
 * fast and guarantees the hierarchy is always consistent (no mismatched
 * commune/province pairs).
 */
class GeoService
{
    /**
     * Resolve the full chain for a commune id.
     *
     * @return array{commune: Commune, district_id: int, province_id: int}
     */
    public function resolve(int $communeId): array
    {
        $commune = Commune::with('district')->find($communeId);

        if (! $commune || ! $commune->district) {
            throw ValidationException::withMessages([
                'commune_id' => 'Unknown commune.',
            ]);
        }

        return [
            'commune' => $commune,
            'district_id' => $commune->district_id,
            'province_id' => $commune->district->province_id,
        ];
    }

    /**
     * Attach geography to a post from its commune. Fills the denormalized
     * district/province columns so ranking filters never need joins.
     * A null commune clears geography (legacy free-text province stays).
     */
    public function attach(Post $post, ?int $communeId): Post
    {
        if ($communeId === null) {
            $post->forceFill([
                'commune_id' => null,
                'district_id' => null,
                'geo_province_id' => null,
            ]);

            return $post;
        }

        $resolved = $this->resolve($communeId);

        $post->forceFill([
            'commune_id' => $resolved['commune']->id,
            'district_id' => $resolved['district_id'],
            'geo_province_id' => $resolved['province_id'],
            // Keep the display province string in sync for existing UIs.
            'province' => $resolved['commune']->district->province->name ?? $post->province,
        ]);

        return $post;
    }
}
