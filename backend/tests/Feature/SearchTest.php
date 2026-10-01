<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 1 hardening (2.3) — bilingual search over the feed.
 */
class SearchTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    protected function setUp(): void
    {
        parent::setUp();
        $this->author = User::factory()->create();
    }

    private function makePost(string $name, string $caption, string $province = 'Kampot'): Post
    {
        return Post::create([
            'user_id' => $this->author->id,
            'category' => 'hidden-gems',
            'location_name' => $name,
            'province' => $province,
            'caption' => $caption,
            'status' => 'published',
        ]);
    }

    public function test_search_filters_by_name_caption_and_province(): void
    {
        $this->makePost('Bokor Hill Station', 'misty mountain road');
        $this->makePost('Night market', 'best បាយឆាឆ្អើង in town', 'Siem Reap');
        $this->makePost('Quiet cafe', 'hidden garden spot');

        $byName = $this->getJson('/api/v1/posts?search=Bokor')->assertStatus(200);
        $names = collect($byName->json('data'))->pluck('location_name');
        $this->assertTrue($names->contains('Bokor Hill Station'));
        $this->assertCount(1, $names);

        $byKhmer = $this->getJson('/api/v1/posts?search='.urlencode('បាយឆាឆ្អើង'))->assertStatus(200);
        $this->assertCount(1, collect($byKhmer->json('data'))->pluck('location_name'));

        $byProvince = $this->getJson('/api/v1/posts?search=Siem Reap')->assertStatus(200);
        $this->assertCount(1, collect($byProvince->json('data'))->pluck('location_name'));
    }

    public function test_location_name_matches_rank_above_caption_matches(): void
    {
        $this->makePost('Other place', 'mentions Kampot pepper in the caption');
        $this->makePost('Kampot pepper farm', 'fresh from the vines');

        $response = $this->getJson('/api/v1/posts?search=Kampot')->assertStatus(200);
        $names = collect($response->json('data'))->pluck('location_name')->values();

        $this->assertSame('Kampot pepper farm', $names->first());
    }
}
