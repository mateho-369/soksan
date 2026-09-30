<?php

namespace App\Services;

use App\Exceptions\BakongUnavailableException;
use App\Models\Business;
use App\Models\BusinessSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Bakong KHQR billing hook (Phase 3).
 *
 * KHQR is Cambodia's national QR payment standard; Bakong is the National
 * Bank of Cambodia's system. Integration shape:
 *
 *   1. createInvoice() asks Bakong for a KHQR for the subscription amount.
 *   2. The owner scans it with any KHQR app and pays.
 *   3. confirmPayment() verifies the payment SERVER-SIDE before the
 *      subscription activates. The client can never activate itself.
 *
 * Verification in this sandbox: NOT POSSIBLE — there is no Bakong merchant
 * account or API key here. With BAKONG_API_KEY unset, createInvoice()
 * produces a well-formed demo invoice and confirmPayment() refuses to
 * activate unless BAKONG_ALLOW_DEMO_CONFIRM=true (explicit opt-in for the
 * demo seam; production keeps it false).
 */
class BakongService
{
    /** Boosted tier price. Single source of truth; adjust with the business. */
    public const BOOSTED_PRICE_USD = 9.90;

    /**
     * Open (or reuse) a pending subscription and build its KHQR payload.
     *
     * @return array{subscription: BusinessSubscription, khqr_payload: string, expires_at: string}
     */
    public function createInvoice(Business $business): array
    {
        $subscription = $business->subscriptions()
            ->whereIn('status', [BusinessSubscription::STATUS_PENDING, BusinessSubscription::STATUS_ACTIVE])
            ->latest('id')
            ->first();

        if ($subscription?->status === BusinessSubscription::STATUS_ACTIVE) {
            throw new BakongUnavailableException('This business is already Boosted.');
        }

        if ($subscription === null) {
            $subscription = $business->subscriptions()->create([
                'status' => BusinessSubscription::STATUS_PENDING,
                'amount_usd' => self::BOOSTED_PRICE_USD,
                'currency' => 'USD',
                'invoice_ref' => 'KHQR-'.strtoupper(Str::random(8)),
            ]);
        }

        $apiKey = config('services.bakong.key');
        if (!empty($apiKey)) {
            // Production: request the real KHQR string from the Bakong API.
            $response = Http::timeout(10)
                ->withHeaders(['Authorization' => 'Bearer '.$apiKey])
                ->post(rtrim((string) config('services.bakong.url'), '/').'/v1/khqr/invoice', [
                    'merchant_id' => config('services.bakong.merchant_id'),
                    'amount' => number_format(self::BOOSTED_PRICE_USD, 2, '.', ''),
                    'currency' => 'USD',
                    'reference' => $subscription->invoice_ref,
                ]);

            if ($response->successful() && $response->json('qr_string')) {
                return [
                    'subscription' => $subscription,
                    'khqr_payload' => (string) $response->json('qr_string'),
                    'expires_at' => now()->addMinutes(15)->toIso8601String(),
                ];
            }

            Log::warning('Bakong invoice request failed', ['status' => $response->status()]);
            throw new BakongUnavailableException('Bakong could not create the KHQR invoice.');
        }

        // Demo seam: deterministic EMV-shaped payload, clearly marked.
        $payload = implode('|', [
            'KHQR',
            'BAKONG-DEMO',
            strtoupper(Str::of($business->name)->replaceMatches('/\s+/', '')->limit(20, '')),
            (string) $subscription->invoice_ref,
            number_format(self::BOOSTED_PRICE_USD, 2, '.', ''),
            'USD',
        ]);

        return [
            'subscription' => $subscription,
            'khqr_payload' => $payload,
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
        ];
    }

    /**
     * Verify the payment and activate. Server-side only — callers must be
     * authenticated and own the business (enforced in the controller).
     */
    public function confirmPayment(Business $business): BusinessSubscription
    {
        $subscription = $business->subscriptions()
            ->where('status', BusinessSubscription::STATUS_PENDING)
            ->latest('id')
            ->first();

        if ($subscription === null) {
            throw new BakongUnavailableException('No payment is pending for this business.');
        }

        $apiKey = config('services.bakong.key');

        if (!empty($apiKey)) {
            // Production: ask Bakong whether this invoice was paid.
            $response = Http::timeout(10)
                ->withHeaders(['Authorization' => 'Bearer '.$apiKey])
                ->get(
                    rtrim((string) config('services.bakong.url'), '/').'/v1/khqr/invoice/status',
                    ['reference' => $subscription->invoice_ref],
                );

            if (!$response->successful() || $response->json('status') !== 'PAID') {
                throw new BakongUnavailableException('Bakong has not confirmed this payment yet.');
            }

            $subscription->bakong_transaction_id = $response->json('transaction_id');
        } elseif (!filter_var(config('services.bakong.allow_demo_confirm'), FILTER_VALIDATE_BOOLEAN)) {
            // Without a key, activation is refused unless the demo flag is on.
            throw new BakongUnavailableException(
                'Bakong API key missing — payment cannot be confirmed in this environment.'
            );
        }

        $subscription->update([
            'status' => BusinessSubscription::STATUS_ACTIVE,
            'paid_at' => now(),
            'starts_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);

        $business->update(['tier' => Business::TIER_BOOSTED]);

        return $subscription->refresh();
    }
}
