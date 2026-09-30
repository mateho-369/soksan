<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stores uploaded media on the configured disk (local "public" disk in dev,
 * Cloudflare R2 in production) with strict type and size validation.
 */
class MediaService
{
    private const ALLOWED_MIME = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
    ];

    private const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    private const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

    /**
     * Persist raw base64 media and return its public URL.
     */
    public function storeBase64(string $base64, string $contentType): string
    {
        abort_unless(in_array($contentType, self::ALLOWED_MIME, true), 422, 'Unsupported media type.');

        $binary = base64_decode($base64, true);
        abort_unless($binary !== false, 422, 'Upload could not be decoded.');

        $isVideo = str_starts_with($contentType, 'video/');
        $limit = $isVideo ? self::MAX_VIDEO_BYTES : self::MAX_IMAGE_BYTES;
        abort_unless(strlen($binary) <= $limit, 422, 'Upload exceeds the size limit.');

        $extension = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
        ][$contentType];

        $path = 'uploads/'.now()->format('Y/m').'/'.Str::random(32).'.'.$extension;

        Storage::disk($this->disk())->put($path, $binary);

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
