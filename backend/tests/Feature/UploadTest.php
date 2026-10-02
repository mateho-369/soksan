<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Phase 0 hardening — SafeMediaService behaviour through the HTTP layer.
 *
 * Requires the GD extension (composer.json ext-gd, Dockerfile). Tests skip
 * gracefully when GD is unavailable so the suite still runs on minimal
 * environments.
 */
class UploadTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD extension not available.');
        }

        Storage::fake('public');
        $this->user = User::factory()->create();
    }

    private function actingAsUser(): self
    {
        return $this->actingAs($this->user, 'sanctum');
    }

    /** Generate a tiny real PNG in memory. */
    private function pngBase64(int $w = 8, int $h = 8): string
    {
        $im = imagecreatetruecolor($w, $h);
        imagefilledrectangle($im, 0, 0, $w, $h, imagecolorallocate($im, 200, 60, 60));
        ob_start();
        imagepng($im);
        $raw = ob_get_clean();
        imagedestroy($im);

        return base64_encode($raw);
    }

    /** Generate a real JPEG, then splice in a fake EXIF APP1 segment. */
    private function jpegWithExifBase64(): string
    {
        $im = imagecreatetruecolor(16, 16);
        imagefilledrectangle($im, 0, 0, 16, 16, imagecolorallocate($im, 60, 120, 200));
        ob_start();
        imagejpeg($im, null, 90);
        $raw = ob_get_clean();
        imagedestroy($im);

        // Inject an APP1 "Exif" segment right after the SOI (FFD8) marker so
        // the input genuinely carries an EXIF payload that must be stripped.
        $exifPayload = "Exif\0\0".'GPS-FAKE-DATA';
        $app1 = "\xFF\xE1".pack('n', strlen($exifPayload) + 2).$exifPayload;

        return base64_encode(substr($raw, 0, 2).$app1.substr($raw, 2));
    }

    public function test_stores_valid_png_and_returns_shape(): void
    {
        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => $this->pngBase64(),
            'contentType' => 'image/png',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['url', 'mime', 'bytes', 'width', 'height']);

        $this->assertSame('image/png', $response->json('mime'));
        $this->assertSame(8, $response->json('width'));
    }

    public function test_strips_exif_gps_from_jpeg(): void
    {
        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => $this->jpegWithExifBase64(),
            'contentType' => 'image/jpeg',
        ]);

        $response->assertStatus(201);

        // The stored file is the re-encoded bytes; they must not contain the
        // injected EXIF/GPS payload any more.
        $files = Storage::disk('public')->allFiles();
        $this->assertNotEmpty($files);

        $stored = Storage::disk('public')->get($files[0]);
        $this->assertStringNotContainsString('GPS-FAKE-DATA', $stored);
        $this->assertStringNotContainsString("Exif\0\0", $stored);
    }

    public function test_rejects_sniffed_mime_mismatch(): void
    {
        // Plain text claimed to be a PNG — finfo sees text/plain and rejects.
        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => base64_encode('definitely not an image at all'),
            'contentType' => 'image/png',
        ]);

        $response->assertStatus(422);
    }

    public function test_blocks_svg(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => base64_encode($svg),
            'contentType' => 'image/svg+xml',
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_corrupted_base64(): void
    {
        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => '!!not-base64!!',
            'contentType' => 'image/png',
        ]);

        $response->assertStatus(422);
    }

    public function test_rejects_oversized_image(): void
    {
        // 6 MiB of random bytes exceeds the 5 MiB image cap once sniffed as
        // image data is not required — we enforce the byte cap on the raw
        // binary. Build a large valid PNG instead so the MIME path is real.
        $big = $this->pngBase64(3000, 3000);
        config(['media.images.max_bytes' => 1024]); // force the cap tiny

        $response = $this->actingAsUser()->postJson('/api/v1/uploads', [
            'fileBase64' => $big,
            'contentType' => 'image/png',
        ]);

        $response->assertStatus(422);
    }

    public function test_requires_authentication(): void
    {
        $this->postJson('/api/v1/uploads', [
            'fileBase64' => $this->pngBase64(),
            'contentType' => 'image/png',
        ])->assertStatus(401);
    }
}
