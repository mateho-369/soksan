<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterBusinessRequest;
use App\Services\BusinessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 3 — business registration + owner dashboard data.
 */
class BusinessController extends Controller
{
    public function __construct(private readonly BusinessService $businesses)
    {
    }

    /** Owner dashboard: the caller's businesses with active subscription. */
    public function mine(Request $request): JsonResponse
    {
        $businesses = $request->user()
            ->businesses()
            ->with(['activeSubscription', 'place'])
            ->latest('id')
            ->get();

        return response()->json($businesses);
    }

    /** Register a new business (free Verified tier, pending admin approval). */
    public function store(RegisterBusinessRequest $request): JsonResponse
    {
        $business = $this->businesses->register($request->user(), $request->validated());

        return response()->json($business, 201);
    }
}
