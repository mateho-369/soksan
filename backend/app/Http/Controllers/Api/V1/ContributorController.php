<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ContributorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 7 — contributor levels & badges. Always derived live from published
 * posts (transparent formula), never stored, never affects ranking.
 */
class ContributorController extends Controller
{
    public function __construct(private readonly ContributorService $contributors)
    {
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->contributors->summary($request->user()));
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($this->contributors->summary($user));
    }
}
