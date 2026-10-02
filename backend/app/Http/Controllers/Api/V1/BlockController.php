<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SafetyRelationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BlockController extends Controller
{
    public function __construct(private readonly SafetyRelationService $safety)
    {
    }

    /** POST /api/v1/users/{user}/block */
    public function store(Request $request, User $user): JsonResponse
    {
        $block = $this->safety->block($request->user(), $user);

        return response()->json(['blocked' => true, 'id' => $block->id], 201);
    }

    /** DELETE /api/v1/users/{user}/block */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->safety->unblock($request->user(), $user);

        return response()->json(['blocked' => false]);
    }
}
