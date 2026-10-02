<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\LeaderboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function __construct(private readonly LeaderboardService $leaderboard)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $limit = min(50, max(1, (int) $request->query('limit', 25)));

        return response()->json([
            'data' => $this->leaderboard->top($limit),
        ]);
    }
}
