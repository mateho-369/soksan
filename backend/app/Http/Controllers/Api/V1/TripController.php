<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\TripList;
use App\Services\TripService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 6 — Trip Planner. Owners manage their lists; anyone can read a
 * public list by its share slug.
 */
class TripController extends Controller
{
    public function __construct(private readonly TripService $trips)
    {
    }

    public function mine(Request $request): JsonResponse
    {
        return response()->json(
            TripList::where('user_id', $request->user()->id)
                ->withCount('items')
                ->orderByDesc('updated_at')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_public' => ['nullable', 'boolean'],
        ]);

        $list = $this->trips->createList(
            $request->user(),
            $data['title'],
            $data['description'] ?? null,
            $data['is_public'] ?? true,
        );

        return response()->json($list, 201);
    }

    public function update(Request $request, TripList $trip): JsonResponse
    {
        $this->authorizeOwner($request, $trip);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_public' => ['nullable', 'boolean'],
        ]);

        return response()->json($this->trips->updateList($trip, $data));
    }

    public function destroy(Request $request, TripList $trip): JsonResponse
    {
        $this->authorizeOwner($request, $trip);
        $trip->delete();

        return response()->json(['ok' => true]);
    }

    /** Public share view: only published posts are embedded. */
    public function show(Request $request, string $slug): JsonResponse
    {
        $list = $this->trips->findShareable($slug, $request->user());

        return response()->json(
            $list->load(['owner:id,name,name_kh,avatar_url', 'items.post' => fn ($q) => $q->published()])
        );
    }

    public function addPost(Request $request, TripList $trip): JsonResponse
    {
        $this->authorizeOwner($request, $trip);

        $data = $request->validate(['post_id' => ['required', 'integer', 'exists:posts,id']]);
        $post = Post::findOrFail($data['post_id']);

        $this->trips->addPost($trip, $post);

        return response()->json($trip->loadCount('items'), 201);
    }

    public function removePost(Request $request, TripList $trip, Post $post): JsonResponse
    {
        $this->authorizeOwner($request, $trip);
        $this->trips->removePost($trip, $post);

        return response()->json($trip->loadCount('items'));
    }

    private function authorizeOwner(Request $request, TripList $trip): void
    {
        if ($trip->user_id !== $request->user()->id) {
            abort(403, 'This trip belongs to another traveler.');
        }
    }
}
