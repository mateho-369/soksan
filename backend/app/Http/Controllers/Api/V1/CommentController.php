<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct(private readonly CommentService $comments)
    {
    }

    public function index(Post $post): JsonResponse
    {
        return CommentResource::collection($this->comments->forPost($post))->response();
    }

    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        $comment = $this->comments->create($request->user(), $post, $request->validated('body'));

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);

        $this->comments->delete($comment);

        return response()->json(['message' => 'Comment removed.']);
    }
}
