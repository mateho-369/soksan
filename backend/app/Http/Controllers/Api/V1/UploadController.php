<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SafeMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function __construct(private readonly SafeMediaService $media)
    {
    }

    /**
     * Accepts a base64 file (matching the web client's composer).
     *
     * Phase 0 hardening: the client's contentType is treated as an
     * UNTRUSTED hint. SafeMediaService sniffs the real MIME from the file
     * bytes, blocks unsafe types (SVG), re-encodes images to strip
     * EXIF/GPS metadata, and enforces size/dimension caps.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fileBase64' => ['required', 'string'],
            // Optional claimed type; must match the sniffed type if present.
            'contentType' => ['nullable', 'string', 'max:120'],
        ]);

        $result = $this->media->storeBase64(
            $validated['fileBase64'],
            $validated['contentType'] ?? null,
        );

        return response()->json($result, 201);
    }
}
