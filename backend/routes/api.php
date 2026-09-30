<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookmarkController;
use App\Http\Controllers\Api\V1\BusinessBillingController;
use App\Http\Controllers\Api\V1\BusinessController;
use App\Http\Controllers\Api\V1\Admin\AdminController;
use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\FollowController;
use App\Http\Controllers\Api\V1\HiddenGemController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\LikeController;
use App\Http\Controllers\Api\V1\OpsController;
use App\Http\Controllers\Api\V1\PartnerPlacementController;
use App\Http\Controllers\Api\V1\PlaceController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\RankingController;
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

    // Auth (heavily rate limited) -----------------------------------------
    Route::middleware('throttle:auth')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
    });

    // Authenticated -------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::post('posts', [PostController::class, 'store']);
        Route::patch('posts/{post}', [PostController::class, 'update']);
        Route::delete('posts/{post}', [PostController::class, 'destroy']);

        Route::post('uploads', UploadController::class);

        Route::post('posts/{post}/comments', [CommentController::class, 'store']);
        Route::delete('comments/{comment}', [CommentController::class, 'destroy']);

        Route::post('posts/{post}/like', [LikeController::class, 'store']);
        Route::delete('posts/{post}/like', [LikeController::class, 'destroy']);

        Route::post('posts/{post}/bookmark', [BookmarkController::class, 'store']);
        Route::delete('posts/{post}/bookmark', [BookmarkController::class, 'destroy']);

        Route::post('users/{user}/follow', [FollowController::class, 'store']);
        Route::delete('users/{user}/follow', [FollowController::class, 'destroy']);

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

        // Monitoring hooks for the scaling plan (queue depth, DB
        // connections, Redis liveness). Admin-only, never public.
        Route::middleware('role:admin')->group(function () {
            Route::get('ops/health', [OpsController::class, 'health']);
            Route::get('ops/metrics', [OpsController::class, 'metrics']);
        });

        // Phase 5 — in-app admin behind role:admin. Every action is audited.
        Route::prefix('admin')->middleware('role:admin')->group(function () {
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
        });
    });
});
