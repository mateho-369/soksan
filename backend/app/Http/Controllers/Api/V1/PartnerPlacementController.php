<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\PartnerPlacementService;
use Illuminate\Http\JsonResponse;

/**
 * Phase 4 — public partner placements.
 *
 * GET /api/v1/placements/active — only placements inside their admin-managed
 * date window. Every client must render these with the ដៃគូ / Partner label.
 */
class PartnerPlacementController extends Controller
{
    public function __construct(private readonly PartnerPlacementService $placements)
    {
    }

    public function active(): JsonResponse
    {
        return response()->json($this->placements->activeAt());
    }
}
