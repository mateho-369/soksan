<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Encoders\GifEncoder;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Encoders\PngEncoder;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Phase 0 hardening — safe media ingestion.
 *
 * Replaces the original MediaService for uploads. Differences that matter:
 *
 *  - the REAL MIME type is sniffed from file bytes (finfo); the client's
 *    claimed contentType is treated as an untrusted hint and must match;
 *  - SVG is blocked outright (script/XXE vector, not sanitized in MVP);
 *  - images are decoded and RE-ENCODED through GD, which strips ALL
 *    EXIF/GPS metadata (critical for a location-based product), drops
 *    polyglot payloads, and caps dimensions at config('media.images.max_dimension');
 *  - videos are size-checked only — moderation/thumbnail/transcoding are
 *    queue work, never inline HTTP work;
 *  - every success returns one consistent shape.
 */
class SafeMediaService
{
    private const EXTENSION = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
    ];

    /**
     * Validate, sanitize and store a base64 upload.
     *
     * @return array{url: string, mime: string, bytes: int, width: ?int, height: ?int}
     */
    public function storeBase64(string $base64, ?string $claimedType = null): array
    {
        $binary = base64_decode(trim($base64), true);
        abort_unless($binary !== false && $binary !== '', 422, 'Upload could not be decoded.');

        $mime = $this->sniffMime($binary);

        if (in_array($mime, config('media.blocked_mimes', []), true)) {
            abort(422, 'SVG uploads are not allowed.');
        }

        if (str_starts_with($mime, 'image/')) {
            return $this->storeImage($binary, $mime, $claimedType);
        }

        if (str_starts_with($mime, 'video/')) {
            return $this->storeVideo($binary, $mime, $claimedType);
        }

        abort(422, "Unsupported media type ({$mime}).");
    }

    /**
     * Images are re-encoded through GD: EXIF/GPS stripped, dimensions
     * capped, embedded payloads destroyed.
     *
     * @return array{url: string, mime: string, bytes: int, width: ?int, height: ?int}
     */
    private function storeImage(string $binary, string $mime, ?string $claimedType): array
    {
        $allowed = config('media.images.mimes');
        abort_unless(in_array($mime, $allowed, true), 422, "Unsupported image type ({$mime}).");

        if ($claimedType !== null && $claimedType !== $mime) {
            abort(422, 'Upload does not match its declared content type.');
        }

        $limit = (int) config('media.images.max_bytes');
        abort_unless(strlen($binary) <= $limit, 422, 'Image exceeds the size limit.');

        $max = (int) config('media.images.max_dimension');

        try {
            $image = ImageManager::gd()->read($binary);
            $image->scaleDown($max, $max);

            $quality = (int) config('media.images.jpeg_quality');
            $reencoded = match ($mime) {
                'image/jpeg' => (string) $image->encode(new JpegEncoder(quality: $quality)),
                'image/png' => (string) $image->encode(new PngEncoder()),
                'image/webp' => (string) $image->encode(new WebpEncoder(quality: $quality)),
                // Animated GIFs flatten to the first frame under GD — an
                // accepted MVP trade-off for guaranteed metadata stripping.
                default => (string) $image->encode(new GifEncoder()),
            };
        } catch (\Throwable) {
            abort(422, 'Image could not be processed.');
        }

        abort_unless(strlen($reencoded) <= $limit, 422, 'Image exceeds the size limit after processing.');

        $path = $this->store($reencoded, self::EXTENSION[$mime]);

        return [
            'url' => $this->publicUrl($path),
            'mime' => $mime,
            'bytes' => strlen($reencoded),
            'width' => $image->width(),
            'height' => $image->height(),
        ];
    }

    /**
     * Videos: size check only. Heavy work (moderation scan, thumbnails,
     * transcoding) belongs on the queue, not in the request cycle.
     *
     * @return array{url: string, mime: string, bytes: int, width: ?int, height: ?int}
     */
    private function storeVideo(string $binary, string $mime, ?string $claimedType): array
    {
        $allowed = config('media.videos.mimes');
        abort_unless(in_array($mime, $allowed, true), 422, "Unsupported video type ({$mime}).");

        if ($claimedType !== null && $claimedType !== $mime) {
            abort(422, 'Upload does not match its declared content type.');
        }

        $limit = (int) config('media.videos.max_bytes');
        abort_unless(strlen($binary) <= $limit, 422, 'Video exceeds the size limit.');

        $path = $this->store($binary, self::EXTENSION[$mime]);

        return [
            'url' => $this->publicUrl($path),
            'mime' => $mime,
            'bytes' => strlen($binary),
            'width' => null,
            'height' => null,
        ];
    }

    private function sniffMime(string $binary): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer(substr($binary, 0, 64 * 1024));

        return is_string($mime) ? strtolower($mime) : 'application/octet-stream';
    }

    private function store(string $binary, string $extension): string
    {
        $path = 'uploads/'.now()->format('Y/m').'/'.Str::random(32).'.'.$extension;

        Storage::disk($this->disk())->put($path, $binary);

        return $path;
    }

    private function publicUrl(string $path): string
    {
        if ($this->disk() === 'public') {
            return Storage::disk('public')->url($path);
        }

        return rtrim((string) config('filesystems.disks.r2.url'), '/').'/'.$path;
    }

    private function disk(): string
    {
        $disk = config('filesystems.media', 'public');

        abort_unless(in_array($disk, ['public', 'r2'], true), 500, 'Media storage is misconfigured.');

        return $disk;
    }
}
