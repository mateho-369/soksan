<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use App\Services\CommentService;
use App\Services\NotificationService;
use App\Services\SafetyRelationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct(
        private readonly CommentService $comments,
        private readonly SafetyRelationService $safety,
        private readonly NotificationService $notifications,
    ) {
    }

    public function index(Post $post): JsonResponse
    {
        return CommentResource::collection($this->comments->forPost($post))->response();
    }

    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        // Phase 0 hardening: blocked users cannot comment on each other's posts.
        abort_if(
            $this->safety->blockedBetween($request->user()->id, $post->user_id),
            403,
            'You cannot interact with this user.',
        );

        $comment = $this->comments->create($request->user(), $post, $request->validated('body'));

        // Phase 1 (2.5) — tell the author someone commented.
        $this->notifications->send(
            $post->author,
            'comment',
            "{$request->user()->name} commented on your post.",
            "{$request->user()->name} បានមតិលើប្រកាសរបស់អ្នក។",
            $post,
            $request->user(),
        );

        return (new CommentResource($comment))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);

        $this->comments->delete($comment);

        return response()->json(['message' => 'Comment removed.']);
    }
}
