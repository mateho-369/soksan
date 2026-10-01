<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Phase 1 hardening (2.5) — in-app notifications.
 *
 * Deliberately local-only: no third-party push, no analytics. Messages
 * are bilingual (EN + KH) and stored alongside the user's account.
 */
class NotificationService
{
    /**
     * Record a notification unless it would be addressed to the actor
     * (no "you liked your own post" noise).
     */
    public function send(
        User $to,
        string $type,
        string $messageEn,
        string $messageKh,
        ?Model $subject = null,
        ?User $actor = null,
    ): ?Notification {
        if (! in_array($type, Notification::TYPES, true)) {
            return null;
        }
        if ($actor !== null && $actor->id === $to->id) {
            return null;
        }

        return Notification::create([
            'user_id' => $to->id,
            'type' => $type,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'actor_id' => $actor?->id,
            'message_en' => $messageEn,
            'message_kh' => $messageKh,
        ]);
    }
}
