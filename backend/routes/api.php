<?php

use App\Http\Controllers\Api\V1\Admin\AdminPostManagementController;
use App\Http\Controllers\Api\V1\Admin\AdminUserManagementController;
use App\Http\Controllers\Api\V1\Admin\ReportAdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BlockController;
use App\Http\Controllers\Api\V1\BookmarkController;
use App\Http\Controllers\Api\V1\BusinessBillingController;
use App\Http\Controllers\Api\V1\BusinessController;
use App\Http\Controllers\Api\V1\Admin\AdminController;
use App\Http\Controllers\Api\V1\CollectionController;
use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\ContributorController;
use App\Http\Controllers\Api\V1\FollowController;
use App\Http\Controllers\Api\V1\HiddenGemController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\LikeController;
use App\Http\Controllers\Api\V1\OpsController;
use App\Http\Controllers\Api\V1\PartnerPlacementController;
use App\Http\Controllers\Api\V1\PlaceController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\MuteController;
use App\Http\Controllers\Api\V1\NearbyPostController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\RankingController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TrendingController;
use App\Http\Controllers\Api\V1\TripController;
use App\Http\Controllers\Api\V1\UploadController;
use App\Http\Controllers\Api\V1\ViewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 — user-facing SokSan Network
|--------------------------------------------------------------------------
| Phase 5: the admin panel is served in-app behind role:admin via the
| /api/v1/admin routes below (extractable to a separate app later).
*/

Route::prefix('v1')->group(function () {
    // Public reads -------------------------------------------------------
    Route::get('posts', [PostController::class, 'index']);
    // Phase 1 (2.2) — geo search; declared before the {post} wildcard.
    Route::get('posts/nearby', [NearbyPostController::class, 'index']);
    Route::get('posts/{post}', [PostController::class, 'show']);
    Route::get('posts/{post}/comments', [CommentController::class, 'index']);
    Route::get('leaderboard', [LeaderboardController::class, 'index']);
    // Geography rankings (commune -> district -> province) with recency decay.
    Route::get('rankings', [RankingController::class, 'index']);

    // Clip view counter — public, cheap (Redis INCR, batch-flushed).
    Route::post('posts/{post}/view', [ViewController::class, 'store']);

    // Phase 4 — lead events: public so guests can tap Call/Directions.
    Route::post('businesses/{business}/leads', [LeadController::class, 'store']);

    // Phase 4 — public partner placements inside their admin date window.
    Route::get('placements/active', [PartnerPlacementController::class, 'active']);

    // Phase 5 — Hidden Gem of the Week (editorial pick, never ranking).
    Route::get('hidden-gem/current', [HiddenGemController::class, 'current']);

    // Phase 6 — Trending Now (recency-weighted, read-only; never writes
    // ranking state) and shareable trip lists.
    Route::get('trending', [TrendingController::class, 'index']);
    Route::get('trips/shared/{slug}', [TripController::class, 'show']);

    // Phase 7 — public collections (browse + read); contributor summaries.
    Route::get('collections', [CollectionController::class, 'index']);
    // Slugs are 10-char random strings; the constraint keeps reserved words
    // like collections/mine (auth group) from being shadowed.
    Route::get('collections/{slug}', [CollectionController::class, 'show'])
        ->where('slug', '[a-z0-9]{10}');
    // Numeric-only so the auth route contributors/me cannot be shadowed.
    Route::get('contributors/{user}', [ContributorController::class, 'show'])->whereNumber('user');

    // Auth (heavily rate limited) -----------------------------------------
    Route::middleware('throttle:auth')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
        // Phase 0 hardening — account recovery (tight limits).
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])
            ->middleware('throttle:password-reset');
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])
            ->middleware('throttle:password-reset');
    });

    // Email verification (signed URL, no auth needed to land on it).
    Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')->name('verification.verify');

    // Authenticated -------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        // Phase 0 hardening — resend verification + account deletion.
        Route::post('email/verification-notification', [AuthController::class, 'sendVerificationNotification'])
            ->middleware('throttle:verification');
        Route::delete('me', [AuthController::class, 'destroy']);

        // Phase 0 hardening: per-action rate limits (see AppServiceProvider).
        Route::post('posts', [PostController::class, 'store'])->middleware('throttle:posts');
        Route::patch('posts/{post}', [PostController::class, 'update']);
        Route::delete('posts/{post}', [PostController::class, 'destroy']);

        Route::post('uploads', UploadController::class)->middleware('throttle:uploads');

        Route::post('posts/{post}/comments', [CommentController::class, 'store'])->middleware('throttle:social');
        Route::delete('comments/{comment}', [CommentController::class, 'destroy']);

        Route::post('posts/{post}/like', [LikeController::class, 'store'])->middleware('throttle:social');
        Route::delete('posts/{post}/like', [LikeController::class, 'destroy']);

        Route::post('posts/{post}/bookmark', [BookmarkController::class, 'store'])->middleware('throttle:social');
        Route::delete('posts/{post}/bookmark', [BookmarkController::class, 'destroy']);

        Route::post('users/{user}/follow', [FollowController::class, 'store'])->middleware('throttle:social');
        Route::delete('users/{user}/follow', [FollowController::class, 'destroy']);

        // Phase 0 hardening — user safety controls.
        Route::post('reports', [ReportController::class, 'store'])->middleware('throttle:reports');
        Route::delete('reports/{report}', [ReportController::class, 'destroy']);
        Route::post('users/{user}/block', [BlockController::class, 'store'])->middleware('throttle:social');
        Route::delete('users/{user}/block', [BlockController::class, 'destroy']);
        Route::post('users/{user}/mute', [MuteController::class, 'store'])->middleware('throttle:social');
        Route::delete('users/{user}/mute', [MuteController::class, 'destroy']);

        // Phase 1 (2.5) — in-app notification inbox (local-only, no push).
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

        // Phase 2 — one-time Google Places confirmation (business) or a
        // manual pin (regular users). See PlacesService.
        Route::post('places/confirm', [PlaceController::class, 'confirm']);

        // Phase 3 — business registration + Boosted-tier billing (Bakong KHQR).
        Route::get('businesses/mine', [BusinessController::class, 'mine']);
        Route::post('businesses', [BusinessController::class, 'store']);
        Route::post('businesses/{business}/upgrade', [BusinessBillingController::class, 'upgrade']);
        Route::post('businesses/{business}/upgrade/confirm', [BusinessBillingController::class, 'confirm']);

        // Phase 4 — lead analytics (owner/admin only; guests can still log
        // lead events via the public route below).
        Route::get('businesses/{business}/leads/summary', [LeadController::class, 'summary']);

        // Phase 6 — Trip Planner (owner CRUD; public read via trips/shared).
        Route::get('trips/mine', [TripController::class, 'mine']);
        Route::post('trips', [TripController::class, 'store']);
        Route::patch('trips/{trip}', [TripController::class, 'update']);
        Route::delete('trips/{trip}', [TripController::class, 'destroy']);
        Route::post('trips/{trip}/posts', [TripController::class, 'addPost']);
        Route::delete('trips/{trip}/posts/{post}', [TripController::class, 'removePost']);

        // Phase 7 — contributor summary for the caller + collection CRUD.
        Route::get('contributors/me', [ContributorController::class, 'me']);
        Route::get('collections/mine', [CollectionController::class, 'mine']);
        Route::post('collections', [CollectionController::class, 'store']);
        Route::patch('collections/{collection}', [CollectionController::class, 'update']);
        Route::delete('collections/{collection}', [CollectionController::class, 'destroy']);
        Route::post('collections/{collection}/posts', [CollectionController::class, 'addPost']);
        Route::delete('collections/{collection}/posts/{post}', [CollectionController::class, 'removePost']);

        // Monitoring hooks for the scaling plan (queue depth, DB
        // connections, Redis liveness). Admin-only, never public.
        Route::middleware('role:admin')->group(function () {
            Route::get('ops/health', [OpsController::class, 'health']);
            Route::get('ops/metrics', [OpsController::class, 'metrics']);
        });

        // Phase 5 — in-app admin behind role:admin. Every action is audited.
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            // Phase 1 (2.4) — dashboard snapshot (read-only counts).
            Route::get('stats', [AdminController::class, 'stats']);
            Route::get('posts/pending', [AdminController::class, 'pendingPosts']);
            Route::post('posts/{post}/approve', [AdminController::class, 'approvePost']);
            Route::post('posts/{post}/reject', [AdminController::class, 'rejectPost']);
            Route::get('businesses/pending', [AdminController::class, 'pendingBusinesses']);
            Route::post('businesses/{business}/approve', [AdminController::class, 'approveBusiness']);
            Route::post('businesses/{business}/reject', [AdminController::class, 'rejectBusiness']);

            Route::get('placements', [AdminController::class, 'placements']);
            Route::post('placements', [AdminController::class, 'storePlacement']);
            Route::patch('placements/{placement}', [AdminController::class, 'updatePlacement']);

            Route::post('hidden-gem', [AdminController::class, 'pickHiddenGem']);
            Route::get('audit-logs', [AdminController::class, 'auditLogs']);

            // Phase 7 — duplicate-place candidates; merge ONLY via this
            // admin-confirmed, audited endpoint.
            Route::get('places/duplicates', [AdminController::class, 'duplicatePlaces']);
            Route::post('places/merge', [AdminController::class, 'mergePlaces']);

            // Phase 0 hardening — report queue + post/user administration.
            Route::get('reports', [ReportAdminController::class, 'index']);
            Route::get('reports/{report}', [ReportAdminController::class, 'show']);
            Route::patch('reports/{report}', [ReportAdminController::class, 'update']);

            Route::get('posts', [AdminPostManagementController::class, 'index']);
            Route::patch('posts/{post}/status', [AdminPostManagementController::class, 'updateStatus']);
            Route::delete('posts/{post}', [AdminPostManagementController::class, 'destroy']);

            Route::get('users', [AdminUserManagementController::class, 'index']);
            Route::patch('users/{user}/status', [AdminUserManagementController::class, 'updateStatus']);
            Route::patch('users/{user}/role', [AdminUserManagementController::class, 'updateRole']);
        });
    });
});
