<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostTest extends TestCase
{
    use RefreshDatabase;

    private function validPost(): array
    {
        return [
            'category' => 'hidden-gems',
            'location_name' => 'Secret Mango Falls',
            'province' => 'Kampot',
            'caption' => 'A quiet waterfall behind the mango orchard.',
            'latitude' => 10.6,
            'longitude' => 104.2,
            'media' => [
                ['media_url' => '/storage/uploads/x.jpg', 'media_type' => 'image'],
            ],
        ];
    }

    public function test_guests_cannot_create_posts(): void
    {
        $this->postJson('/api/v1/posts', $this->validPost())->assertStatus(401);
    }

    public function test_users_can_create_posts(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/posts', $this->validPost());

        $response->assertStatus(201)
            ->assertJsonPath('data.location_name', 'Secret Mango Falls');
        $this->assertDatabaseHas('posts', ['location_name' => 'Secret Mango Falls', 'user_id' => $user->id]);
        $this->assertDatabaseHas('media', ['type' => 'image']);
    }

    public function test_post_creation_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/posts', ['caption' => 'no place given'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'location_name', 'province']);
    }

    public function test_feed_lists_published_posts_with_counts(): void
    {
        Post::factory()->count(3)->create();

        $this->getJson('/api/v1/posts')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure(['data' => [['id', 'location_name', 'author', 'media', 'like_count']]]);
    }

    public function test_feed_filters_by_category(): void
    {
        Post::factory()->create(['category' => 'hidden-gems']);
        Post::factory()->create(['category' => 'aesthetic-cafes']);

        $this->getJson('/api/v1/posts?category=aesthetic-cafes')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_only_owner_can_update_a_post(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')
            ->patchJson("/api/v1/posts/{$post->id}", ['caption' => 'hijacked'])
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/v1/posts/{$post->id}", ['caption' => 'updated caption'])
            ->assertStatus(200)
            ->assertJsonPath('data.caption', 'updated caption');
    }

    public function test_only_owner_or_admin_can_delete_a_post(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $first = Post::factory()->create(['user_id' => $owner->id]);
        $second = Post::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other, 'sanctum')->deleteJson("/api/v1/posts/{$first->id}")->assertStatus(403);
        $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/posts/{$first->id}")->assertStatus(200);
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/posts/{$second->id}")->assertStatus(200);

        $this->assertDatabaseCount('posts', 0);
    }
}
