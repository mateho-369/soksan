<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 0 hardening — post administration behind role:admin (routes).
 * Separate from the Phase 5 approval queue: this covers ALL posts
 * (list/override status/remove) for trust & safety follow-up.
 */
class AdminPostManagementController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {
    }

    /** GET /api/v1/admin/posts?status=&province=&page= */
    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()
            ->with('author:id,name')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->value()))
            ->when($request->filled('province'), fn ($query) => $query->where('province', $request->string('province')->value()))
            ->latest('id')
            ->paginate(25);

        return response()->json($posts);
    }

    /** PATCH /api/v1/admin/posts/{post}/status — published|pending_review|rejected */
    public function updateStatus(Request $request, Post $post): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:published,pending_review,rejected'],
        ]);

        $post->update(['status' => $validated['status']]);

        // Phase 1 (2.5) — keep the author informed about review outcomes.
        if ($validated['status'] === 'published') {
            $this->notifications->send(
                $post->author,
                'post_approved',
                'Your post is live. Happy exploring!',
                'ប្រកាសរបស់អ្នកត្រូវបានបង្ហោះហើយ។ សូមធ្វើដំណើរដោយរីករាយ!',
                $post,
                $request->user(),
            );
        } elseif ($validated['status'] === 'rejected') {
            $this->notifications->send(
                $post->author,
                'post_rejected',
                'Your post was not approved. See our community guidelines for why.',
                'ប្រកាសរបស់អ្នកមិនត្រូវបានអនុម័តទេ។ សូមមើលគោលការណ៍សហគមន៍របស់យើង។',
                $post,
                $request->user(),
            );
        }

        $this->audit->record($request->user(), 'post.status', $post, ['status' => $validated['status']]);

        return response()->json($post->only(['id', 'location_name', 'status']));
    }

    /** DELETE /api/v1/admin/posts/{post} — hard removal for legal/abuse. */
    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->audit->record($request->user(), 'post.delete', $post);

        $post->delete();

        return response()->json(['message' => 'Post removed.']);
    }
}
