<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function __construct(private readonly MediaService $media)
    {
    }

    /**
     * Accepts a base64 file (matching the web client's composer) and stores
     * it on the configured media disk after validating type and size.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fileBase64' => ['required', 'string'],
            'contentType' => ['required', 'string', 'in:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'],
        ]);

        $url = $this->media->storeBase64($validated['fileBase64'], $validated['contentType']);

        return response()->json(['url' => $url], 201);
    }
}
