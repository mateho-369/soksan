<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocialTest extends TestCase
{
    use RefreshDatabase;

    public function test_likes_toggle_on_and_off(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/posts/{$post->id}/like")->assertStatus(201);
        $this->assertDatabaseHas('likes', ['post_id' => $post->id, 'user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/posts/{$post->id}/like")->assertStatus(200);
        $this->assertDatabaseMissing('likes', ['post_id' => $post->id, 'user_id' => $user->id]);
    }

    public function test_bookmarks_toggle_on_and_off(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/posts/{$post->id}/bookmark")->assertStatus(201);
        $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/posts/{$post->id}/bookmark")->assertStatus(200);
        $this->assertDatabaseCount('bookmarks', 0);
    }

    public function test_users_cannot_follow_themselves(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/users/{$user->id}/follow")
            ->assertStatus(422);
    }

    public function test_follow_and_unfollow(): void
    {
        $follower = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($follower, 'sanctum')->postJson("/api/v1/users/{$target->id}/follow")->assertStatus(201);
        $this->assertDatabaseHas('follows', ['follower_id' => $follower->id, 'followed_id' => $target->id]);

        $this->actingAs($follower, 'sanctum')->deleteJson("/api/v1/users/{$target->id}/follow")->assertStatus(200);
        $this->assertDatabaseCount('follows', 0);
    }

    public function test_comments_can_be_created_and_listed(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'Beautiful place!'])
            ->assertStatus(201);

        $this->getJson("/api/v1/posts/{$post->id}/comments")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_empty_comments_are_rejected(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/posts/{$post->id}/comments", ['body' => ''])
            ->assertStatus(422);
    }

    public function test_only_owner_or_admin_can_delete_comments(): void
    {
        $author = User::factory()->create();
        $stranger = User::factory()->create();
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $post = Post::factory()->create();
        $comment = Comment::create([
            'post_id' => $post->id,
            'user_id' => $author->id,
            'body' => 'First!',
        ]);

        $this->actingAs($stranger, 'sanctum')->deleteJson("/api/v1/comments/{$comment->id}")->assertStatus(403);
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/comments/{$comment->id}")->assertStatus(200);
        $this->assertDatabaseCount('comments', 0);
    }
}
