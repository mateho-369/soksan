<?php

namespace App\Services;

use App\Models\Business;
use App\Models\LeadEvent;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Phase 4 — lead tracking. Call / Message / Directions taps on a business
 * profile. Owners read summaries; nothing here ever touches ranking.
 */
class LeadService
{
    /** Record one lead event. Guests pass a null user. */
    public function record(Business $business, string $eventType, ?User $user = null): LeadEvent
    {
        if (!in_array($eventType, LeadEvent::TYPES, true)) {
            throw new \InvalidArgumentException("Unknown lead event type: {$eventType}");
        }

        return LeadEvent::query()->create([
            'business_id' => $business->id,
            'event_type' => $eventType,
            'user_id' => $user?->id,
        ]);
    }

    /**
     * Per-type totals for the dashboard within a date range.
     *
     * @return array{call: int, message: int, directions: int, total: int, from: string, to: string}
     */
    public function summarize(Business $business, ?string $from = null, ?string $to = null): array
    {
        $to = $to ? CarbonImmutable::parse($to)->endOfDay() : CarbonImmutable::now();
        $from = $from ? CarbonImmutable::parse($from)->startOfDay() : $to->subDays(7)->startOfDay();

        $rows = LeadEvent::query()
            ->where('business_id', $business->id)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('event_type, count(*) as total')
            ->groupBy('event_type')
            ->pluck('total', 'event_type');

        $call = (int) ($rows[LeadEvent::TYPE_CALL] ?? 0);
        $message = (int) ($rows[LeadEvent::TYPE_MESSAGE] ?? 0);
        $directions = (int) ($rows[LeadEvent::TYPE_DIRECTIONS] ?? 0);

        return [
            'call' => $call,
            'message' => $message,
            'directions' => $directions,
            'total' => $call + $message + $directions,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }
}
