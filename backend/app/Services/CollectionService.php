<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\CollectionPost;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Phase 7 — public Collections. Rules mirror trips but collections are
 * ALWAYS public and browsable; only published posts can be collected.
 */
class CollectionService
{
    public function create(User $user, string $title, ?string $description = null): Collection
    {
        return Collection::create([
            'user_id' => $user->id,
            'title' => trim($title),
            'slug' => $this->uniqueSlug(),
            'description' => $description,
        ]);
    }

    public function update(Collection $collection, array $attributes): Collection
    {
        $collection->update(array_intersect_key($attributes, array_flip(['title', 'description'])));

        return $collection->refresh();
    }

    public function addPost(Collection $collection, Post $post): CollectionPost
    {
        if ($post->status !== 'published') {
            abort(422, 'Only published posts can be collected.');
        }

        $existing = CollectionPost::where('collection_id', $collection->id)
            ->where('post_id', $post->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        $next = (int) CollectionPost::where('collection_id', $collection->id)->max('sort_order');

        return CollectionPost::create([
            'collection_id' => $collection->id,
            'post_id' => $post->id,
            'sort_order' => $next + 1,
        ]);
    }

    public function removePost(Collection $collection, Post $post): void
    {
        CollectionPost::where('collection_id', $collection->id)
            ->where('post_id', $post->id)
            ->delete();
    }

    private function uniqueSlug(): string
    {
        do {
            $slug = Str::lower(Str::random(10));
        } while (Collection::where('slug', $slug)->exists());

        return $slug;
    }
}
