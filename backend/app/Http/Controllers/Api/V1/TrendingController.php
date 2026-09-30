<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TrendingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Public "Trending Now" — recency-weighted hot posts, read-only. */
class TrendingController extends Controller
{
    public function __construct(private readonly TrendingService $trending)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $limit = min(25, max(1, (int) $request->query('limit', '10')));

        return response()->json([
            'half_life_days' => TrendingService::TRENDING_HALF_LIFE_DAYS,
            'window_days' => TrendingService::TRENDING_WINDOW_DAYS,
            'posts' => $this->trending->trending($limit),
        ]);
    }
}
