<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 — partner placements with admin date ranges.
 *
 * A placement is visible to the public ONLY while:
 *   active = true AND starts_at <= now AND (ends_at IS NULL OR ends_at > now)
 *
 * Placements are always labeled "ដៃគូ / Partner" in the UI and NEVER touch
 * organic ranking. Management UI arrives with the Phase 5 admin panel;
 * the date-range mechanics live here already.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_placements', function (Blueprint $table) {
            $table->id();
            $table->string('business_name');
            $table->string('business_name_kh')->nullable();
            $table->string('partner_type', 60);
            $table->string('province', 80);
            $table->string('phone', 40)->nullable();
            $table->string('telegram_url')->nullable();
            $table->text('description')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('cover_url')->nullable();
            $table->boolean('active')->default(true);
            // Admin date range — NULL ends_at = open-ended.
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            // Who scheduled it — Phase 5 audit log hooks into this.
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['active', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_placements');
    }
};
