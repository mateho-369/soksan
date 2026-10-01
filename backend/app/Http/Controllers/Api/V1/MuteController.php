<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SafetyRelationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MuteController extends Controller
{
    public function __construct(private readonly SafetyRelationService $safety)
    {
    }

    /** POST /api/v1/users/{user}/mute — optional muted_until ISO timestamp. */
    public function store(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'muted_until' => ['nullable', 'date'],
        ]);

        $until = $request->filled('muted_until')
            ? \Illuminate\Support\Carbon::parse($request->string('muted_until')->value())
            : null;

        $mute = $this->safety->mute($request->user(), $user, $until);

        return response()->json(['muted' => true, 'id' => $mute->id], 201);
    }

    /** DELETE /api/v1/users/{user}/mute */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->safety->unmute($request->user(), $user);

        return response()->json(['muted' => false]);
    }
}
