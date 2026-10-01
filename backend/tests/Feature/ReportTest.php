<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 0 hardening — reporting, blocks, mutes through the HTTP layer.
 */
class ReportTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $reporter;

    private User $admin;

    private Post $post;

    protected function setUp(): void
    {
        parent::setUp();

        $this->author = User::factory()->create();
        $this->author->assignRole('user');
        $this->reporter = User::factory()->create();
        $this->reporter->assignRole('user');
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->post = Post::create([
            'user_id' => $this->author->id,
            'category' => 'hidden-gems',
            'location_name' => 'Test Place',
            'province' => 'Kampot',
            'caption' => 'Hello',
            'status' => 'published',
        ]);
    }

    public function test_user_can_report_a_post(): void
    {
        $this->actingAs($this->reporter, 'sanctum')
            ->postJson('/api/v1/reports', [
                'reportable_type' => 'post',
                'reportable_id' => $this->post->id,
                'reason' => 'scam',
                'details' => 'Fake listing',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('reports', [
            'reportable_id' => $this->post->id,
            'reason' => 'scam',
            'status' => 'pending',
        ]);
    }

    public function test_duplicate_report_is_rejected(): void
    {
        $payload = [
            'reportable_type' => 'post',
            'reportable_id' => $this->post->id,
            'reason' => 'spam',
        ];

        $this->actingAs($this->reporter, 'sanctum')->postJson('/api/v1/reports', $payload)->assertStatus(201);
        $this->actingAs($this->reporter, 'sanctum')->postJson('/api/v1/reports', $payload)->assertStatus(409);
    }

    public function test_unknown_reason_is_rejected(): void
    {
        $this->actingAs($this->reporter, 'sanctum')
            ->postJson('/api/v1/reports', [
                'reportable_type' => 'post',
                'reportable_id' => $this->post->id,
                'reason' => 'not-a-reason',
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_list_and_review_reports(): void
    {
        $report = Report::create([
            'reporter_id' => $this->reporter->id,
            'reportable_type' => Post::class,
            'reportable_id' => $this->post->id,
            'reason' => 'nudity',
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/reports?status=pending')
            ->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/reports/{$report->id}", ['decision' => 'approved'])
            ->assertStatus(200);

        $this->assertSame('rejected', $this->post->refresh()->status);
    }

    public function test_report_queue_requires_admin(): void
    {
        $this->actingAs($this->reporter, 'sanctum')
            ->getJson('/api/v1/admin/reports')
            ->assertStatus(403);
    }

    public function test_post_auto_hides_after_threshold_reports(): void
    {
        config(['moderation.auto_hide_reports' => 3]);

        foreach (range(1, 3) as $i) {
            $user = User::factory()->create();
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/v1/reports', [
                    'reportable_type' => 'post',
                    'reportable_id' => $this->post->id,
                    'reason' => 'fake_place',
                ])
                ->assertStatus(201);
        }

        $this->assertSame('pending_review', $this->post->refresh()->status);
    }

    public function test_block_prevents_follow(): void
    {
        $this->actingAs($this->author, 'sanctum')
            ->postJson("/api/v1/users/{$this->reporter->id}/block")
            ->assertStatus(201);

        $this->actingAs($this->reporter, 'sanctum')
            ->postJson("/api/v1/users/{$this->author->id}/follow")
            ->assertStatus(403);
    }
}
