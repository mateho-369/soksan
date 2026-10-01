<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Phase 1 hardening (2.2) — GET /api/v1/posts/nearby.
 *
 * Returns published posts within a radius of a point, sorted by distance.
 * Coordinates are returned through PostResource, i.e. rounded to each
 * post's public precision — exact points never leave the API.
 */
class NearbyPostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius_km' => ['sometimes', 'numeric', 'between:0.1,100'],
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $radiusKm = min(100, max(0.1, (float) ($validated['radius_km'] ?? 25)));
        $perPage = min(50, max(1, (int) ($validated['per_page'] ?? 20)));

        $query = Post::query()
            ->where('status', 'published')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->with(['author', 'media'])
            ->withCount(['likes', 'comments']);

        if (DB::getDriverName() === 'pgsql') {
            // PostGIS path: geography maths in metres, GIST-indexed.
            $query
                ->whereRaw(
                    'ST_DWithin(location_point::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)',
                    [$lng, $lat, $radiusKm * 1000]
                )
                ->orderByRaw(
                    'ST_Distance(location_point::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) ASC',
                    [$lng, $lat]
                )
                ->select('posts.*')
                ->selectRaw(
                    'ROUND(ST_Distance(location_point::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000.0, 2) AS distance_km',
                    [$lng, $lat]
                );
        } else {
            // Portable haversine fallback (SQLite test database).
            $expression = sprintf(
                '(6371 * acos(cos(radians(%F)) * cos(radians(latitude)) * cos(radians(longitude) - radians(%F)) + sin(radians(%F)) * sin(radians(latitude))))',
                $lat,
                $lng,
                $lat
            );
            $query
                ->whereRaw("{$expression} <= ?", [$radiusKm])
                ->orderByRaw("{$expression} ASC")
                ->selectRaw("{$expression} AS distance_km");
        }

        $posts = $query->paginate($perPage)->appends($request->query());

        return PostResource::collection($posts)
            ->additional(['meta' => [
                'center' => ['latitude' => $lat, 'longitude' => $lng],
                'radius_km' => $radiusKm,
            ]])
            ->response();
    }
}
