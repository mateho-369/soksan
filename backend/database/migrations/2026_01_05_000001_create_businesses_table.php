<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — business registration.
 *
 * Two tiers:
 *   - verified (free): approved presence + profile badge.
 *   - boosted (paid): spotlight on the business profile only. NEVER affects
 *     organic ranking and is always labeled as paid in public surfaces.
 *
 * New registrations start `pending` and wait for admin approval (Phase 5
 * approval queue + audit log).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('name_kh')->nullable();
            $table->string('category', 60);
            $table->text('description')->nullable();
            $table->string('phone', 40)->nullable();
            // Confirmed place from Phase 2 (Google Places or manual pin).
            $table->foreignId('place_id')->nullable()->constrained('places')->nullOnDelete();
            $table->string('place_name')->nullable();
            $table->enum('tier', ['verified', 'boosted'])->default('verified');
            $table->enum('status', ['pending', 'approved', 'rejected', 'suspended'])->default('pending');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'tier']);
            // One approved business per confirmed place (duplicate handling
            // itself lives in Phase 7 with admin-confirmed merges).
            $table->unique(['place_id'], 'businesses_place_id_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
