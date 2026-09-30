<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\FeedCacheService;
use App\Services\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function __construct(
        private readonly PostService $posts,
        private readonly FeedCacheService $feedCache,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');
        $province = $request->query('province');
        $search = $request->query('search');
        $page = max(1, (int) $request->query('page', 1));

        // Anonymous feed pages are pre-computed in Redis (short TTL +
        // write-through invalidation, see FeedCacheService). Authenticated
        // requests stay live because they carry per-viewer flags.
        if ($request->user() === null) {
            $cached = $this->feedCache->get($category, $province, $search, $page);

            if ($cached !== null) {
                return response()->json($cached);
            }
        }

        $feed = $this->posts->feed($request->user(), $category, $province, $search, $page);
        $response = PostResource::collection($feed)->response();

        if ($request->user() === null) {
            $this->feedCache->put($category, $province, $search, $page, $response->getData(true));
        }

        return $response;
    }

    public function show(Request $request, int $post): JsonResponse
    {
        $found = $this->posts->findPublished($post, $request->user());

        abort_unless($found !== null, 404, 'That story is no longer here.');

        return (new PostResource($found))->response();
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $created = $this->posts->create($request->user(), $request->validated());

        return (new PostResource($created))->response()->setStatusCode(201);
    }

    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $this->authorize('update', $post);

        $updated = $this->posts->update($post, $request->validated());

        return (new PostResource($updated))->response();
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $this->posts->delete($post);

        return response()->json(['message' => 'Post removed.']);
    }
}
