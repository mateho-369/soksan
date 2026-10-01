<?php

namespace App\Services;

use App\Jobs\ModeratePostJob;
use App\Models\Post;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PostService
{
    public function __construct(
        private readonly FeedCacheService $feedCache,
        private readonly LeaderboardService $leaderboard,
        private readonly GeoService $geo,
    ) {
    }

    /**
     * Public feed of published posts, newest first, with per-viewer flags.
     */
    public function feed(?User $viewer, ?string $category, ?string $province, ?string $search, int $page = 1): LengthAwarePaginator
    {
        $viewerId = $viewer?->id;

        return Post::query()
            ->published()
            ->when($category, fn ($query, $value) => $query->where('category', $value))
            ->when($province, fn ($query, $value) => $query->where('province', $value))
            ->when($search, function ($query, $value) {
                // Phase 1 (2.3) — bilingual search. Postgres gets ILIKE
                // (case-insensitive, Khmer is unaffected by case anyway)
                // plus GIN trigram indexes from the pg_trgm migration;
                // SQLite keeps LIKE for the test suite.
                $like = DB::getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
                $pattern = '%'.$value.'%';

                $query->where(function ($q) use ($like, $pattern) {
                    $q->whereRaw("location_name {$like} ?", [$pattern])
                        ->orWhereRaw("province {$like} ?", [$pattern])
                        ->orWhereRaw("caption {$like} ?", [$pattern]);
                })
                    // Light relevance ranking: name hits beat province hits
                    // beat caption hits; newest first inside a tier.
                    ->orderByRaw(
                        "(CASE WHEN location_name {$like} ? THEN 2 WHEN province {$like} ? THEN 1 ELSE 0 END) DESC",
                        [$pattern, $pattern]
                    );
            })
            ->with(['author', 'media'])
            ->withCount(['likes', 'comments'])
            ->when($viewerId, function ($query) use ($viewerId) {
                $query
                    ->withExists([
                        'likes as is_liked' => fn ($q) => $q->where('likes.user_id', $viewerId),
                        'bookmarks as is_saved' => fn ($q) => $q->where('bookmarks.user_id', $viewerId),
                    ]);
            })
            ->latest()
            ->paginate(15, ['*'], 'page', $page);
    }

    public function findPublished(int $id, ?User $viewer): ?Post
    {
        $viewerId = $viewer?->id;

        return Post::query()
            ->published()
            ->with(['author', 'media'])
            ->withCount(['likes', 'comments'])
            ->when($viewerId, function ($query) use ($viewerId) {
                $query->withExists([
                    'likes as is_liked' => fn ($q) => $q->where('likes.user_id', $viewerId),
                    'bookmarks as is_saved' => fn ($q) => $q->where('bookmarks.user_id', $viewerId),
                ]);
            })
            ->find($id);
    }

    public function create(User $user, array $validated): Post
    {
        $post = DB::transaction(function () use ($user, $validated) {
            // Phase 5 first-post gate: an account with no published posts yet
            // gets its FIRST post held for review; later posts publish
            // immediately. Admins release it via the moderation queue.
            $firstPostGate = !$user->posts()->where('status', 'published')->exists();

            $post = $user->posts()->create(collect($validated)
                ->only(['category', 'location_name', 'province', 'caption', 'latitude', 'longitude'])
                ->all() + ['status' => $firstPostGate ? 'pending_review' : 'published']);

            // Tag to commune; district/province derive automatically.
            $this->geo->attach($post, isset($validated['commune_id']) ? (int) $validated['commune_id'] : null);
            $post->save();

            foreach (($validated['media'] ?? []) as $index => $item) {
                $post->media()->create([
                    'url' => $item['media_url'],
                    'type' => $item['media_type'],
                    'sort_order' => $index,
                    'duration_seconds' => $item['duration_seconds'] ?? null,
                ]);
            }

            return $post->load(['author', 'media']);
        });

        // Write-through invalidation: cached feed pages for this province
        // are dropped immediately (the TTL is only a safety net).
        $this->feedCache->invalidate($post->province);
        // Instant leaderboard movement; the scheduled rebuild corrects drift.
        $this->leaderboard->bump((string) $post->province);
        // Moderation runs on the Redis queue in a worker container —
        // never inline in this request.
        ModeratePostJob::dispatch($post)->afterCommit();

        return $post;
    }

    public function update(Post $post, array $validated): Post
    {
        $post->update($validated);

        return $post->fresh(['author', 'media']);
    }

    public function delete(Post $post): void
    {
        $province = (string) $post->province;

        $post->delete();

        $this->feedCache->invalidate($province);
    }
}
