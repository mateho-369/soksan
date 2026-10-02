<?php

namespace App\Services;

use App\Exceptions\PlacesUnavailableException;
use App\Models\Place;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One-time Google Places confirmation (Phase 2).
 *
 * Business rules:
 *  - Google is used ONLY here, at business-registration time, to confirm a
 *    place exists and to capture its canonical place_id + lat/lng. Google
 *    never renders maps in this product (cost policy).
 *  - A place_id is confirmed at most once: subsequent calls return the
 *    stored row instead of hitting the API again.
 *  - Regular users don't go through Google at all — they drop a manual pin.
 *
 * Env required in production: GOOGLE_PLACES_API_KEY (see config/services.php).
 */
class PlacesService
{
    private const PLACES_API_BASE = 'https://places.googleapis.com/v1/places';

    /**
     * Confirm a Google Place ID exactly once and persist the result.
     *
     * @throws PlacesUnavailableException when no API key is configured or
     *                                    Google cannot confirm the place.
     */
    public function confirmByPlaceId(string $placeId, ?User $confirmedBy = null): Place
    {
        // One-time confirmation: reuse what we already stored.
        $existing = Place::query()->where('place_id', $placeId)->first();
        if ($existing !== null) {
            return $existing;
        }

        $apiKey = config('services.google_places.key');
        if (empty($apiKey)) {
            throw new PlacesUnavailableException(
                'Google Places API key is not configured. Set GOOGLE_PLACES_API_KEY or use a manual pin.'
            );
        }

        $response = Http::timeout(10)
            ->withHeaders([
                'X-Goog-Api-Key' => $apiKey,
                // Minimal field mask: name, address, geometry — cheap lookup.
                'X-Goog-FieldMask' => 'id,displayName,formattedAddress,location',
            ])
            ->get(self::PLACES_API_BASE.'/'.urlencode($placeId));

        if ($response->failed() || $response->json('location') === null) {
            Log::warning('Places confirmation failed', [
                'place_id' => $placeId,
                'status' => $response->status(),
            ]);

            throw new PlacesUnavailableException('Google could not confirm this place.');
        }

        return Place::query()->create([
            'source' => Place::SOURCE_GOOGLE,
            'place_id' => $placeId,
            'name' => $response->json('displayName.text', 'Unknown place'),
            'formatted_address' => $response->json('formatted_address'),
            'lat' => (float) $response->json('location.latitude'),
            'lng' => (float) $response->json('location.longitude'),
            'confirmed_by_user_id' => $confirmedBy?->id,
            'confirmed_at' => now(),
        ]);
    }

    /**
     * Manual pin path (regular users): store raw coordinates without any
     * external confirmation. Coordinates are clamped to sanity upstream.
     */
    public function createManual(string $name, float $lat, float $lng, ?User $createdBy = null): Place
    {
        return Place::query()->create([
            'source' => Place::SOURCE_MANUAL,
            'name' => $name,
            'lat' => $lat,
            'lng' => $lng,
            'confirmed_by_user_id' => $createdBy?->id,
            'confirmed_at' => now(),
        ]);
    }
}
