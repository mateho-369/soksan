<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 8 — referral, badge-only (no monetary incentive by product rule).
 * Every account gets a stable shareable code; signups may carry the code of
 * the friend who invited them. The ONLY reward is the "welcomer" badge.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('referral_code', 12)->nullable()->unique();
            $table->foreignId('referred_by_user_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referred_by_user_id');
            $table->dropColumn('referral_code');
        });
    }
};
