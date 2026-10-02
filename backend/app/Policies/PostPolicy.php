<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    /**
     * Phase 0 hardening: exact coordinates are owner/admin-only. Everyone
     * else receives coordinates rounded to the post's location_precision
     * (see PostResource).
     */
    public function viewExactLocation(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->hasRole('admin');
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->hasRole('admin');
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->hasRole('admin');
    }
}
