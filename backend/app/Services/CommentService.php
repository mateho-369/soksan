<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CommentService
{
    public function __construct(
        private readonly CounterService $counters,
        private readonly FeedCacheService $feedCache,
    ) {
    }

    public function forPost(Post $post): LengthAwarePaginator
    {
        return $post->comments()->with('author')->latest()->paginate(25);
    }

    public function create(User $user, Post $post, string $body): Comment
    {
        $comment = $post->comments()->create([
            'user_id' => $user->id,
            'body' => $body,
        ])->load('author');

        $this->counters->mirrorComment($post->id, 1);
        // Comment counts appear on feed cards — refresh cached pages.
        $this->feedCache->invalidate($post->province);

        return $comment;
    }

    public function delete(Comment $comment): void
    {
        $post = $comment->post;

        $comment->delete();

        if ($post !== null) {
            $this->counters->mirrorComment($post->id, -1);
            $this->feedCache->invalidate($post->province);
        }
    }
}
