<?php

namespace App\Services;

use App\Models\Business;
use App\Models\Post;
use App\Models\User;

/**
 * Phase 5 — moderation queue behind role:admin.
 *
 * First-post gate: a brand-new account's FIRST post enters
 * `pending_review` (see PostService::create); everything after is
 * published immediately. Approving/rejecting is audited.
 */
class ModerationService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly BusinessService $businesses,
    ) {
    }

    public function approvePost(Post $post, User $admin): Post
    {
        $post->update(['status' => 'published']);
        $this->audit->record($admin, 'post.approve', $post);

        return $post->refresh();
    }

    public function rejectPost(Post $post, User $admin, ?string $reason = null): Post
    {
        $post->update(['status' => 'rejected']);
        $this->audit->record($admin, 'post.reject', $post, $reason ? ['reason' => $reason] : []);

        return $post->refresh();
    }

    public function approveBusiness(Business $business, User $admin): Business
    {
        $approved = $this->businesses->approve($business, $admin);
        $this->audit->record($admin, 'business.approve', $approved);

        return $approved;
    }

    public function rejectBusiness(Business $business, User $admin): Business
    {
        $rejected = $this->businesses->reject($business, $admin);
        $this->audit->record($admin, 'business.reject', $rejected);

        return $rejected;
    }
}
