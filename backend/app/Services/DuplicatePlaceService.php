<?php

namespace App\Services;

use App\Models\Place;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Phase 7 — duplicate-place detection + admin-confirmed merge.
 *
 * Detection is advisory only: it produces CANDIDATE pairs. A merge happens
 * exclusively through merge(), which requires an admin (route-level
 * role:admin) and writes an audit row. Nothing is ever merged silently.
 *
 * Candidate rule (either):
 *   - haversine distance <= NEAR_METERS, or
 *   - identical normalized name (lower-case, punctuation/diacritics stripped)
 * among places not already merged.
 */
class DuplicatePlaceService
{
    public const NEAR_METERS = 200;

    public function __construct(private readonly AuditService $audit)
    {
    }

    /** @return Collection<int, array{a: Place, b: Place, distance_m: float|null, reason: string}> */
    public function candidates(): Collection
    {
        $places = Place::query()->whereNull('merged_into_id')->get();
        $pairs = collect();

        foreach ($places as $i => $a) {
            foreach ($places->slice($i + 1) as $b) {
                $distance = $this->haversineMeters(
                    (float) $a->lat,
                    (float) $a->lng,
                    (float) $b->lat,
                    (float) $b->lng,
                );
                $sameName = $this->normalize($a->name) === $this->normalize($b->name);

                if ($distance <= self::NEAR_METERS) {
                    $pairs->push([
                        'a' => $a,
                        'b' => $b,
                        'distance_m' => round($distance, 1),
                        'reason' => $sameName ? 'near + same name' : 'nearby',
                    ]);
                } elseif ($sameName) {
                    $pairs->push([
                        'a' => $a,
                        'b' => $b,
                        'distance_m' => round($distance, 1),
                        'reason' => 'same name',
                    ]);
                }
            }
        }

        return $pairs;
    }

    /**
     * Admin-confirmed merge: $duplicate folds into $canonical. Posts pointing
     * at the duplicate are re-attached to the canonical place; the duplicate
     * row survives as history with merged_into_id set.
     */
    public function merge(Place $canonical, Place $duplicate, User $admin): Place
    {
        if ($canonical->id === $duplicate->id) {
            abort(422, 'A place cannot be merged into itself.');
        }
        if ($canonical->merged_into_id || $duplicate->merged_into_id) {
            abort(422, 'One of these places is already merged.');
        }

        Post::query()->where('place_id', $duplicate->id)->update(['place_id' => $canonical->id]);

        $duplicate->forceFill([
            'merged_into_id' => $canonical->id,
            'merged_at' => now(),
        ])->save();

        $this->audit->record($admin, 'place.merge', $canonical, [
            'duplicate_place_id' => $duplicate->id,
            'duplicate_name' => $duplicate->name,
        ]);

        return $canonical->refresh();
    }

    public function normalize(string $name): string
    {
        $name = strtolower($name);
        // Strip common Khmer/Latin diacritics, then punctuation + spacing.
        if (function_exists('iconv')) {
            $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
            if ($transliterated !== false) {
                $name = $transliterated;
            }
        }
        $name = preg_replace('/[^a-z0-9\p{Khmer}]+/u', ' ', $name) ?? $name;

        return trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
    }

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earth * asin(min(1, sqrt($h)));
    }
}
