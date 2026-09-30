<?php

namespace App\Services;

use App\Models\Post;
use App\Models\TripList;
use App\Models\TripListItem;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Phase 6 — Trip Planner. A trip list is an ordered collection of published
 * posts owned by one user, shareable through a public slug. Business rules:
 *
 *  - only PUBLISHED posts can be added (moderation pipeline respected);
 *  - a post can appear once per list (unique index enforces it too);
 *  - slugs are random + unique, so share links are unguessable;
 *  - private lists 404 for everyone except their owner.
 */
class TripService
{
    public function createList(User $user, string $title, ?string $description = null, bool $isPublic = true): TripList
    {
        return TripList::create([
            'user_id' => $user->id,
            'title' => trim($title),
            'slug' => $this->uniqueSlug(),
            'description' => $description,
            'is_public' => $isPublic,
        ]);
    }

    public function updateList(TripList $list, array $attributes): TripList
    {
        $list->update(array_intersect_key($attributes, array_flip(['title', 'description', 'is_public'])));

        return $list->refresh();
    }

    public function addPost(TripList $list, Post $post): TripListItem
    {
        if ($post->status !== 'published') {
            abort(422, 'Only published posts can be added to a trip.');
        }

        $existing = TripListItem::where('trip_list_id', $list->id)
            ->where('post_id', $post->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        $next = (int) TripListItem::where('trip_list_id', $list->id)->max('sort_order');

        return TripListItem::create([
            'trip_list_id' => $list->id,
            'post_id' => $post->id,
            'sort_order' => $next + 1,
        ]);
    }

    public function removePost(TripList $list, Post $post): void
    {
        TripListItem::where('trip_list_id', $list->id)
            ->where('post_id', $post->id)
            ->delete();
    }

    /** Public lookup by slug; private lists are invisible to non-owners. */
    public function findShareable(string $slug, ?User $viewer = null): TripList
    {
        $list = TripList::where('slug', $slug)->firstOrFail();

        if (! $list->is_public && $viewer?->id !== $list->user_id) {
            abort(404);
        }

        return $list;
    }

    private function uniqueSlug(): string
    {
        do {
            $slug = Str::lower(Str::random(10));
        } while (TripList::where('slug', $slug)->exists());

        return $slug;
    }
}
