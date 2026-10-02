<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\BakongUnavailableException;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Services\BakongService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Phase 3 — Boosted-tier billing over Bakong KHQR.
 *
 * POST /api/v1/businesses/{business}/upgrade          -> open invoice + KHQR
 * POST /api/v1/businesses/{business}/upgrade/confirm  -> verify + activate
 *
 * Activation is ALWAYS confirmed server-side against Bakong; the client
 * only ever asks.
 */
class BusinessBillingController extends Controller
{
    public function __construct(private readonly BakongService $bakong)
    {
    }

    public function upgrade(Request $request, Business $business): JsonResponse
    {
        $this->authorizeOwner($request, $business);

        try {
            $invoice = $this->bakong->createInvoice($business);
        } catch (BakongUnavailableException $exception) {
            return response()->json(['error' => $exception->getMessage()], 409);
        }

        return response()->json([
            'invoice' => [
                'invoice_ref' => $invoice['subscription']->invoice_ref,
                'business_id' => $business->id,
                'amount_usd' => $invoice['subscription']->amount_usd,
                'currency' => $invoice['subscription']->currency,
                'khqr_payload' => $invoice['khqr_payload'],
                'expires_at' => $invoice['expires_at'],
            ],
            'subscription' => $invoice['subscription'],
        ], 201);
    }

    public function confirm(Request $request, Business $business): JsonResponse
    {
        $this->authorizeOwner($request, $business);

        try {
            $subscription = $this->bakong->confirmPayment($business);
        } catch (BakongUnavailableException $exception) {
            return response()->json(['error' => $exception->getMessage()], 409);
        }

        return response()->json($business->refresh()->load('activeSubscription'));
    }

    private function authorizeOwner(Request $request, Business $business): void
    {
        abort_unless($request->user()?->id === $business->owner_id, 403, 'Not your business.');
    }
}
