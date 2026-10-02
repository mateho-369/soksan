<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\CounterService;
use Illuminate\Http\JsonResponse;

/**
 * Public view counter for clips. Deliberately unauthenticated and cheap:
 * one Redis INCR per call, batch-flushed to Postgres by counters:flush.
 */
class ViewController extends Controller
{
    public function __construct(private readonly CounterService $counters)
    {
    }

    public function store(Post $post): JsonResponse
    {
        $this->counters->registerView($post->id);

        return response()->json(['ok' => true], 202);
    }
}
