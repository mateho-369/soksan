<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SafetyRelationService;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function __construct(
        private readonly SocialService $social,
        private readonly SafetyRelationService $safety,
    ) {
    }

    public function store(Request $request, User $user): JsonResponse
    {
        // Phase 0 hardening: a block in either direction ends social contact.
        abort_if(
            $this->safety->blockedBetween($request->user()->id, $user->id),
            403,
            'You cannot interact with this user.',
        );

        $following = $this->social->toggleFollow($request->user(), $user);

        return response()->json(['following' => $following], $following ? 201 : 200);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->social->toggleFollow($request->user(), $user);

        return response()->json(['message' => 'Unfollowed.']);
    }
}
