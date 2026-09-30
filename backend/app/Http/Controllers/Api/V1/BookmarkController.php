<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\SocialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookmarkController extends Controller
{
    public function __construct(private readonly SocialService $social)
    {
    }

    public function store(Request $request, Post $post): JsonResponse
    {
        $saved = $this->social->toggleBookmark($request->user(), $post);

        return response()->json(['saved' => $saved], $saved ? 201 : 200);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->social->toggleBookmark($request->user(), $post);

        return response()->json(['message' => 'Bookmark removed.']);
    }
}
