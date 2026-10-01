<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Notification;
use App\Models\Post;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 1 hardening (2.5) — in-app notification inbox.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $fan;

    private User $admin;

    private Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->author = User::factory()->create();
        $this->fan = User::factory()->create();
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->post = Post::create([
            'user_id' => $this->author->id,
            'category' => 'hidden-gems',
            'location_name' => 'Quiet place',
            'province' => 'Kampot',
            'caption' => 'hello',
            'status' => 'published',
        ]);
    }

    public function test_liking_a_post_notifies_the_author(): void
    {
        $this->actingAs($this->fan, 'sanctum')
            ->postJson("/api/v1/posts/{$this->post->id}/like")
            ->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->author->id,
            'type' => 'like',
            'actor_id' => $this->fan->id,
            'is_read' => false,
        ]);
    }

    public function test_self_likes_do_not_notify(): void
    {
        $this->actingAs($this->author, 'sanctum')
            ->postJson("/api/v1/posts/{$this->post->id}/like")
            ->assertStatus(201);

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_commenting_notifies_the_author(): void
    {
        $this->actingAs($this->fan, 'sanctum')
            ->postJson("/api/v1/posts/{$this->post->id}/comments", ['body' => 'Nice!'])
            ->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->author->id,
            'type' => 'comment',
        ]);
    }

    public function test_inbox_unread_count_and_mark_read(): void
    {
        Notification::create([
            'user_id' => $this->author->id,
            'type' => 'like',
            'message_en' => 'x liked your post.',
            'message_kh' => 'x បានចូលចិត្តប្រកាសរបស់អ្នក។',
        ]);

        $this->actingAs($this->author, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count')
            ->assertStatus(200)
            ->assertJson(['count' => 1]);

        $notification = Notification::first();

        $this->actingAs($this->author, 'sanctum')
            ->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertStatus(200);
        $this->assertTrue($notification->refresh()->is_read);

        $this->actingAs($this->author, 'sanctum')
            ->postJson('/api/v1/notifications/read-all')
            ->assertStatus(200);

        // Someone else's notification is not readable through my session.
        $other = User::factory()->create();
        $theirs = Notification::create([
            'user_id' => $other->id,
            'type' => 'like',
            'message_en' => 'x',
            'message_kh' => 'x',
        ]);
        $this->actingAs($this->author, 'sanctum')
            ->postJson("/api/v1/notifications/{$theirs->id}/read")
            ->assertStatus(404);
    }

    public function test_report_review_notifies_the_content_owner(): void
    {
        $reporter = User::factory()->create();
        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => Post::class,
            'reportable_id' => $this->post->id,
            'reason' => 'spam',
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/reports/{$report->id}", ['decision' => 'dismissed'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->author->id,
            'type' => 'report_reviewed',
        ]);
    }

    public function test_admin_status_change_notifies_the_author(): void
    {
        $this->post->update(['status' => 'pending_review']);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/posts/{$this->post->id}/status", ['status' => 'published'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->author->id,
            'type' => 'post_approved',
        ]);
    }
}
