<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — Boosted-tier billing via Bakong KHQR.
 *
 * Lifecycle: pending_payment -> active (Bakong confirmation) -> expired,
 * or pending_payment -> cancelled. Activation happens ONLY after the
 * payment is verified server-side (BakongService) — never on the client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->enum('status', ['pending_payment', 'active', 'expired', 'cancelled'])
                ->default('pending_payment');
            $table->decimal('amount_usd', 8, 2);
            $table->char('currency', 3)->default('USD');
            // Bakong-side references (populated from the gateway response).
            $table->string('invoice_ref', 80)->nullable()->unique();
            $table->string('bakong_transaction_id', 120)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_subscriptions');
    }
};
