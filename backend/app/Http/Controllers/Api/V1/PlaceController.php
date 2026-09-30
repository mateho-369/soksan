<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\PlacesUnavailableException;
use App\Http\Controllers\Controller;
use App\Services\PlacesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 2 — place confirmation endpoints.
 *
 * POST /api/v1/places/confirm
 *   { place_id }            -> one-time Google Places confirmation (business)
 *   { name, lat, lng }      -> manual pin (regular user, no Google)
 */
class PlaceController extends Controller
{
    public function __construct(private readonly PlacesService $places)
    {
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'place_id' => ['nullable', 'string', 'max:191'],
            'name' => ['nullable', 'string', 'min:2', 'max:160'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        try {
            if (!empty($validated['place_id'])) {
                $place = $this->places->confirmByPlaceId($validated['place_id'], $request->user());
            } elseif (isset($validated['lat'], $validated['lng'])) {
                $place = $this->places->createManual(
                    $validated['name'] ?? 'Pinned place',
                    (float) $validated['lat'],
                    (float) $validated['lng'],
                    $request->user(),
                );
            } else {
                return response()->json(['error' => 'Provide a place_id or lat/lng.'], 422);
            }
        } catch (PlacesUnavailableException $exception) {
            // No key / Google down: degrade to manual pin if coordinates came
            // along, otherwise tell the client clearly.
            if (isset($validated['lat'], $validated['lng'])) {
                $place = $this->places->createManual(
                    $validated['name'] ?? 'Pinned place',
                    (float) $validated['lat'],
                    (float) $validated['lng'],
                    $request->user(),
                );

                return response()->json([
                    'place' => $place,
                    'warning' => 'Google Places unavailable — saved as a manual pin.',
                ]);
            }

            return response()->json(['error' => $exception->getMessage()], 502);
        }

        return response()->json(['place' => $place], 201);
    }
}
