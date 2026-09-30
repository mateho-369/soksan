<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function __construct(private readonly SocialService $social)
    {
    }

    public function store(Request $request, Post $post): JsonResponse
    {
        $liked = $this->social->toggleLike($request->user(), $post);

        return response()->json(['liked' => $liked], $liked ? 201 : 200);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->social->toggleLike($request->user(), $post);

        return response()->json(['message' => 'Like removed.']);
    }
}
