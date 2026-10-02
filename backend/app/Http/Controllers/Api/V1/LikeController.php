<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\NotificationService;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function __construct(
        private readonly SocialService $social,
        private readonly NotificationService $notifications,
    ) {
    }

    public function store(Request $request, Post $post): JsonResponse
    {
        $liked = $this->social->toggleLike($request->user(), $post);

        if ($liked) {
            // Phase 1 (2.5) — tell the author someone liked their story.
            $this->notifications->send(
                $post->author,
                'like',
                "{$request->user()->name} liked your post.",
                "{$request->user()->name} បានចូលចិត្តប្រកាសរបស់អ្នក។",
                $post,
                $request->user(),
            );
        }

        return response()->json(['liked' => $liked], $liked ? 201 : 200);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->social->toggleLike($request->user(), $post);

        return response()->json(['message' => 'Like removed.']);
    }
}
