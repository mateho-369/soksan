<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\PartnerPlacement;
use App\Models\Place;
use App\Models\Post;
use App\Services\DuplicatePlaceService;
use App\Services\HiddenGemService;
use App\Services\ModerationService;
use App\Services\PartnerPlacementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 5 — in-app admin behind role:admin (enforced in routes). Every
 * action here is audited by the services it calls.
 */
class AdminController extends Controller
{
    public function __construct(
        private readonly ModerationService $moderation,
        private readonly PartnerPlacementService $placements,
        private readonly HiddenGemService $hiddenGems,
        private readonly DuplicatePlaceService $duplicates,
    ) {
    }

    /* ── moderation: first-post gate ─────────────────────────────────── */

    public function pendingPosts(): JsonResponse
    {
        return response()->json(
            Post::query()->where('status', 'pending_review')->with('author')->latest('id')->get()
        );
    }

    public function approvePost(Request $request, Post $post): JsonResponse
    {
        return response()->json($this->moderation->approvePost($post, $request->user()));
    }

    public function rejectPost(Request $request, Post $post): JsonResponse
    {
        return response()->json(
            $this->moderation->rejectPost($post, $request->user(), $request->string('reason')->value())
        );
    }

    /* ── business approvals ──────────────────────────────────────────── */

    public function pendingBusinesses(): JsonResponse
    {
        return response()->json(
            Business::query()->where('status', Business::STATUS_PENDING)->with('owner')->latest('id')->get()
        );
    }

    public function approveBusiness(Request $request, Business $business): JsonResponse
    {
        return response()->json($this->moderation->approveBusiness($business, $request->user()));
    }

    public function rejectBusiness(Request $request, Business $business): JsonResponse
    {
        return response()->json($this->moderation->rejectBusiness($business, $request->user()));
    }

    /* ── partner placement scheduling (Phase 4 mechanics, admin UI) ──── */

    public function placements(): JsonResponse
    {
        return response()->json(PartnerPlacement::query()->orderByDesc('id')->get());
    }

    public function storePlacement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'min:2', 'max:160'],
            'business_name_kh' => ['nullable', 'string', 'max:160'],
            'partner_type' => ['required', 'string', 'max:60'],
            'province' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:40'],
            'telegram_url' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
            'cover_url' => ['nullable', 'string', 'max:2048'],
            'active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);

        return response()->json($this->placements->schedule($request->user(), $validated), 201);
    }

    public function updatePlacement(Request $request, PartnerPlacement $placement): JsonResponse
    {
        $validated = $request->validate([
            'active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);

        return response()->json($this->placements->update($request->user(), $placement, $validated));
    }

    /* ── hidden gem of the week ──────────────────────────────────────── */

    public function pickHiddenGem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'post_id' => ['required', 'integer', 'exists:posts,id'],
            'note' => ['nullable', 'string', 'max:280'],
        ]);

        $post = Post::query()->findOrFail($validated['post_id']);

        return response()->json($this->hiddenGems->pick($post, $request->user(), $validated['note'] ?? null), 201);
    }

    /* ── audit log ───────────────────────────────────────────────────── */

    public function auditLogs(): JsonResponse
    {
        return response()->json(
            AuditLog::query()->with('user:id,name')->latest('id')->limit(200)->get()
        );
    }

    /* ── duplicate places (Phase 7) — merge ONLY after admin confirms ── */

    public function duplicatePlaces(): JsonResponse
    {
        return response()->json($this->duplicates->candidates());
    }

    public function mergePlaces(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'canonical_place_id' => ['required', 'integer', 'exists:places,id'],
            'duplicate_place_id' => ['required', 'integer', 'exists:places,id'],
        ]);

        $canonical = Place::query()->findOrFail($validated['canonical_place_id']);
        $duplicate = Place::query()->findOrFail($validated['duplicate_place_id']);

        return response()->json($this->duplicates->merge($canonical, $duplicate, $request->user()));
    }
}
