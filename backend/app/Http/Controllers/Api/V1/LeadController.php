<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 4 — lead events.
 *
 * POST /api/v1/businesses/{business}/leads           (public: guests too)
 * GET  /api/v1/businesses/{business}/leads/summary   (owner/admin, date range)
 */
class LeadController extends Controller
{
    public function __construct(private readonly LeadService $leads)
    {
    }

    public function store(Request $request, Business $business): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => ['required', 'string', 'in:call,message,directions'],
        ]);

        $event = $this->leads->record($business, $validated['event_type'], $request->user());

        return response()->json(['ok' => true, 'id' => $event->id], 201);
    }

    public function summary(Request $request, Business $business): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user !== null && ($user->id === $business->owner_id || $user->hasRole('admin')),
            403,
            'Only the owner can see lead analytics.',
        );

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(
            $this->leads->summarize($business, $validated['from'] ?? null, $validated['to'] ?? null)
        );
    }
}
