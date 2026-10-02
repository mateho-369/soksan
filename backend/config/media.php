<?php

/*
|--------------------------------------------------------------------------
| Media upload policy (Phase 0 hardening)
|--------------------------------------------------------------------------
| Central limits for user uploads, enforced by SafeMediaService.
| Client-provided MIME types are NEVER trusted: the real type is sniffed
| from file contents (finfo) and images are re-encoded, which also strips
| EXIF/GPS metadata.
*/

return [
    'images' => [
        'mimes' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        'max_bytes' => (int) env('MEDIA_MAX_IMAGE_BYTES', 5 * 1024 * 1024),
        // Longest edge after re-encode. Keeps storage sane and limits
        // decompression-style abuse.
        'max_dimension' => (int) env('MEDIA_MAX_DIMENSION', 2560),
        'jpeg_quality' => (int) env('MEDIA_JPEG_QUALITY', 85),
    ],

    'videos' => [
        // Size-checked only; transcoding/thumbnails/moderation run on the
        // queue later — never inline in the HTTP request.
        'mimes' => ['video/mp4', 'video/webm'],
        'max_bytes' => (int) env('MEDIA_MAX_VIDEO_BYTES', 25 * 1024 * 1024),
    ],

    // SVG can carry script/XXE payloads and is not sanitized here. Blocked
    // for the MVP; re-enable only behind a reviewed sanitizer.
    'blocked_mimes' => ['image/svg+xml', 'image/svg'],
];
