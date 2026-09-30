<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\RankingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Geographic rankings with recency decay: commune -> district -> province.
 * National "Top Cambodia" is the provinces scope.
 */
class RankingController extends Controller
{
    public function __construct(private readonly RankingService $rankings)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $scope = (string) $request->query('scope', 'provinces');

        if (! in_array($scope, ['communes', 'districts', 'provinces'], true)) {
            return response()->json(['error' => 'scope must be communes, districts or provinces'], 422);
        }

        return response()->json([
            'data' => $this->rankings->top(
                $scope,
                min(50, max(1, (int) $request->query('limit', 25))),
                $request->query('province_id') !== null ? (int) $request->query('province_id') : null,
            ),
            'meta' => [
                'scope' => $scope,
                'half_life_days' => RankingService::HALF_LIFE_DAYS,
            ],
        ]);
    }
}
