<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\Post;
use App\Services\CollectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 7 — public Collections. Everyone can browse; only owners mutate.
 */
class CollectionController extends Controller
{
    public function __construct(private readonly CollectionService $collections)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json(
            Collection::query()->withCount('posts')->with('owner:id,name,name_kh,avatar_url')
                ->orderByDesc('updated_at')
                ->get()
        );
    }

    public function show(string $slug): JsonResponse
    {
        $collection = Collection::where('slug', $slug)
            ->with(['owner:id,name,name_kh,avatar_url', 'posts.post' => fn ($q) => $q->published()])
            ->firstOrFail();

        return response()->json($collection);
    }

    public function mine(Request $request): JsonResponse
    {
        return response()->json(
            Collection::where('user_id', $request->user()->id)->withCount('posts')->orderByDesc('updated_at')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json(
            $this->collections->create($request->user(), $data['title'], $data['description'] ?? null),
            201,
        );
    }

    public function update(Request $request, Collection $collection): JsonResponse
    {
        $this->authorizeOwner($request, $collection);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json($this->collections->update($collection, $data));
    }

    public function destroy(Request $request, Collection $collection): JsonResponse
    {
        $this->authorizeOwner($request, $collection);
        $collection->delete();

        return response()->json(['ok' => true]);
    }

    public function addPost(Request $request, Collection $collection): JsonResponse
    {
        $this->authorizeOwner($request, $collection);

        $data = $request->validate(['post_id' => ['required', 'integer', 'exists:posts,id']]);
        $this->collections->addPost($collection, Post::findOrFail($data['post_id']));

        return response()->json($collection->loadCount('posts'), 201);
    }

    public function removePost(Request $request, Collection $collection, Post $post): JsonResponse
    {
        $this->authorizeOwner($request, $collection);
        $this->collections->removePost($collection, $post);

        return response()->json($collection->loadCount('posts'));
    }

    private function authorizeOwner(Request $request, Collection $collection): void
    {
        if ($collection->user_id !== $request->user()->id) {
            abort(403, 'This collection belongs to another traveler.');
        }
    }
}
