<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 1 hardening (2.2) — GET /api/v1/posts/nearby.
 * Runs against the portable haversine fallback on SQLite; the PostGIS
 * ST_DWithin branch takes over automatically on Postgres.
 */
class NearbyPostTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    protected function setUp(): void
    {
        parent::setUp();
        $this->author = User::factory()->create();
    }

    private function makePost(float $lat, float $lng, string $name): Post
    {
        return Post::create([
            'user_id' => $this->author->id,
            'category' => 'hidden-gems',
            'location_name' => $name,
            'province' => 'Phnom Penh',
            'caption' => $name,
            'latitude' => $lat,
            'longitude' => $lng,
            'status' => 'published',
        ]);
    }

    public function test_nearby_returns_posts_within_radius_sorted_by_distance(): void
    {
        $near = $this->makePost(11.5620, 104.9310, 'PP riverside');
        $this->makePost(13.3671, 103.8448, 'Siem Reap town'); // ~314 km away

        $response = $this->getJson('/api/v1/posts/nearby?lat=11.5564&lng=104.9282&radius_km=50')
            ->assertStatus(200);

        $names = collect($response->json('data'))->pluck('location_name');
        $this->assertTrue($names->contains('PP riverside'));
        $this->assertFalse($names->contains('Siem Reap town'));

        $distances = collect($response->json('data'))->pluck('distance_km');
        $this->assertSame($distances->sort()->values()->all(), $distances->values()->all());
        $this->assertSame(50.0, (float) $response->json('meta.radius_km'));
    }

    public function test_nearby_rounds_coordinates_for_public_viewers(): void
    {
        $post = $this->makePost(11.123456, 104.654321, 'Fuzzy spot');
        $post->update(['location_precision' => 2]);

        $response = $this->getJson('/api/v1/posts/nearby?lat=11.5564&lng=104.9282&radius_km=100')
            ->assertStatus(200);

        $spot = collect($response->json('data'))->firstWhere('location_name', 'Fuzzy spot');
        $this->assertNotNull($spot);
        $this->assertEqualsWithDelta(11.12, (float) $spot['latitude'], 0.001);
        $this->assertFalse($spot['has_exact_location']);
    }

    public function test_nearby_requires_valid_coordinates(): void
    {
        $this->getJson('/api/v1/posts/nearby')->assertStatus(422);
        $this->getJson('/api/v1/posts/nearby?lat=200&lng=0')->assertStatus(422);
    }

    public function test_nearby_excludes_unpublished_posts(): void
    {
        $this->makePost(11.5570, 104.9290, 'Visible spot');
        $hidden = $this->makePost(11.5580, 104.9270, 'Hidden spot');
        $hidden->update(['status' => 'pending_review']);

        $response = $this->getJson('/api/v1/posts/nearby?lat=11.5564&lng=104.9282&radius_km=20')
            ->assertStatus(200);

        $names = collect($response->json('data'))->pluck('location_name');
        $this->assertTrue($names->contains('Visible spot'));
        $this->assertFalse($names->contains('Hidden spot'));
    }
}
