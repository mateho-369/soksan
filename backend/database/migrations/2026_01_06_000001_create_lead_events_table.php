<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 — monetization: lead events.
 *
 * Every tap of Call / Message / Directions on a business profile is stored
 * here. Owners see 7-day summaries on their dashboard; the data never
 * feeds organic ranking (ranking reads post engagement only).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->enum('event_type', ['call', 'message', 'directions']);
            // Nullable: guests can tap Call/Directions without an account.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['business_id', 'event_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_events');
    }
};
