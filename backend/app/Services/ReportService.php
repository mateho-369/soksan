<?php

namespace App\Services;

use App\Models\Comment;
use App\Models\Post;
use App\Models\Report;
use App\Models\User;

/**
 * Phase 0 hardening — real moderation reports.
 *
 * Users report posts/comments from a closed reason list; one report per
 * reporter per item. When pending reports on a post reach the threshold
 * (config('moderation.auto_hide_reports')) the post is automatically
 * pulled into the review queue (status pending_review) — reversible by an
 * admin. Approving a report hides the content; every admin decision is
 * audited.
 */
class ReportService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {
    }

    /**
     * @param  class-string  $type  Post::class or Comment::class
     */
    public function file(User $reporter, string $type, int $id, string $reason, ?string $details): Report
    {
        abort_unless(in_array($reason, config('moderation.reasons', []), true), 422, 'Unknown report reason.');

        $target = $type::findOrFail($id);

        // Self-reporting is not a real use case and pollutes the queue.
        $authorId = $target instanceof Post ? $target->user_id : $target->user_id;
        abort_if($authorId === $reporter->id, 422, 'You cannot report your own content.');

        $exists = Report::where('reporter_id', $reporter->id)
            ->where('reportable_type', $type)
            ->where('reportable_id', $id)
            ->exists();
        abort_if($exists, 409, 'You already reported this item.');

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reportable_type' => $type,
            'reportable_id' => $id,
            'reason' => $reason,
            'details' => $details,
            'status' => 'pending',
        ]);

        $this->maybeAutoHide($type, $id);

        return $report;
    }

    public function withdraw(User $reporter, Report $report): void
    {
        abort_unless($report->reporter_id === $reporter->id, 403, 'You can only withdraw your own reports.');
        abort_unless($report->status === 'pending', 422, 'Only pending reports can be withdrawn.');

        $report->delete();
    }

    /**
     * Admin review. `approved` hides the reported content; `rejected` and
     * `dismissed` leave it up. All decisions are audited.
     */
    public function review(User $admin, Report $report, string $decision): Report
    {
        abort_unless(in_array($decision, ['approved', 'rejected', 'dismissed'], true), 422, 'Invalid decision.');

        $report->update([
            'status' => $decision,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $target = $report->reportable;

        if ($decision === 'approved') {
            if ($target instanceof Post) {
                $target->update(['status' => 'rejected']);
            } elseif ($target instanceof Comment) {
                $target->delete();
            }
        }

        // Phase 1 (2.5) — let the content owner know the outcome.
        if ($target !== null) {
            $owner = $target->author ?? null;
            if ($owner !== null) {
                $this->notifications->send(
                    $owner,
                    'report_reviewed',
                    $decision === 'approved'
                        ? 'A report about your content was upheld and it is no longer public.'
                        : 'A report about your content was reviewed and no action was taken.',
                    $decision === 'approved'
                        ? 'របាយការណ៍អំពីមាតិការបស់អ្នកត្រូវបានអនុម័ត ហើយវាលែងបង្ហាញជាសាធារណៈទៀតហើយ។'
                        : 'របាយការណ៍អំពីមាតិការបស់អ្នកត្រូវបានពិនិត្យ ដោយគ្មានវិធានការ។',
                    $target,
                    $admin,
                );
            }
        }

        $this->audit->record($admin, 'report.'.$decision, $report, ['reason' => $report->reason]);

        return $report->refresh();
    }

    /**
     * Threshold guard: pull heavily-reported content out of the public
     * feed until an admin looks at it.
     *
     * @param  class-string  $type
     */
    private function maybeAutoHide(string $type, int $id): void
    {
        if ($type !== Post::class) {
            return;
        }

        $threshold = (int) config('moderation.auto_hide_reports', 3);

        $pending = Report::where('reportable_type', $type)
            ->where('reportable_id', $id)
            ->where('status', 'pending')
            ->count();

        if ($pending < $threshold) {
            return;
        }

        $post = Post::find($id);

        if ($post !== null && $post->status === 'published') {
            $post->update(['status' => 'pending_review']);
        }
    }
}
