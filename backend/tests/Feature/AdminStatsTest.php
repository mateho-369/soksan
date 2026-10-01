<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 1 hardening (2.4) — admin dashboard stats endpoint.
 */
class AdminStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admins_get_counts_only(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $author = User::factory()->create();

        Post::create([
            'user_id' => $author->id,
            'category' => 'hidden-gems',
            'location_name' => 'A',
            'province' => 'Kampot',
            'caption' => 'a',
            'status' => 'published',
        ]);
        Post::create([
            'user_id' => $author->id,
            'category' => 'hidden-gems',
            'location_name' => 'B',
            'province' => 'Kampot',
            'caption' => 'b',
            'status' => 'pending_review',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/stats')
            ->assertStatus(200);

        $response->assertJsonPath('posts.total', 2);
        $response->assertJsonPath('posts.published', 1);
        $response->assertJsonPath('posts.pending_review', 1);
        $response->assertJsonPath('users.total', 2);
        $response->assertJsonPath('top_provinces.0.province', 'Kampot');
    }

    public function test_stats_require_admin_role(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/admin/stats')->assertStatus(403);
        $this->getJson('/api/v1/admin/stats')->assertStatus(401);
    }
}
