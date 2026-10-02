<?php

namespace App\Services;

use App\Models\Follow;
use App\Models\Post;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class SocialService
{
    public function __construct(private readonly CounterService $counters)
    {
    }

    /** @return bool true when a like was added, false when removed */
    public function toggleLike(User $user, Post $post): bool
    {
        $existing = $post->likes()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->delete();
            // Postgres rows are the source of truth; the Redis mirror is a
            // best-effort fast path for hot lists.
            $this->counters->mirrorLike($post->id, -1);

            return false;
        }

        $post->likes()->create(['user_id' => $user->id]);
        $this->counters->mirrorLike($post->id, 1);

        return true;
    }

    /** @return bool true when a bookmark was added, false when removed */
    public function toggleBookmark(User $user, Post $post): bool
    {
        $existing = $post->bookmarks()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        $post->bookmarks()->create(['user_id' => $user->id]);

        return true;
    }

    /** @return bool true when a follow was added, false when removed */
    public function toggleFollow(User $follower, User $target): bool
    {
        if ($follower->id === $target->id) {
            throw ValidationException::withMessages([
                'user' => 'You cannot follow yourself.',
            ]);
        }

        $existing = Follow::where('follower_id', $follower->id)
            ->where('followed_id', $target->id)
            ->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        Follow::create(['follower_id' => $follower->id, 'followed_id' => $target->id]);

        return true;
    }
}
