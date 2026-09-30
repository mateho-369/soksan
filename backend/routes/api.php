<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookmarkController;
use App\Http\Controllers\Api\V1\CommentController;
use App\Http\Controllers\Api\V1\FollowController;
use App\Http\Controllers\Api\V1\LeaderboardController;
use App\Http\Controllers\Api\V1\LikeController;
use App\Http\Controllers\Api\V1\OpsController;
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\RankingController;
use App\Http\Controllers\Api\V1\UploadController;
use App\Http\Controllers\Api\V1\ViewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 — user-facing SokSan Network
|--------------------------------------------------------------------------
| The future admin panel will be a separate website consuming this same
| versioned API (plus its own /api/v1/admin routes, guarded by role:admin).
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

        // Monitoring hooks for the scaling plan (queue depth, DB
        // connections, Redis liveness). Admin-only, never public.
        Route::middleware('role:admin')->group(function () {
            Route::get('ops/health', [OpsController::class, 'health']);
            Route::get('ops/metrics', [OpsController::class, 'metrics']);
        });
    });
});
