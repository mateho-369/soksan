<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Phase 5 — append-only audit trail. Every admin/moderation action calls
 * record(); the admin panel reads the same table. Nothing here is ever
 * updated or deleted.
 */
class AuditService
{
    public function record(User $actor, string $action, ?Model $subject = null, array $meta = []): AuditLog
    {
        return AuditLog::query()->create([
            'user_id' => $actor->id,
            'action' => $action,
            'auditable_type' => $subject ? $subject->getMorphClass() : null,
            'auditable_id' => $subject?->getKey(),
            'meta' => $meta ?: null,
        ]);
    }
}
