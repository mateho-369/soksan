<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 7 — duplicate-place merges. A place merged into its canonical twin
 * keeps its row (history matters) but points at the survivor; reads filter
 * merged rows out. Merges ONLY ever happen through the admin-confirmed
 * endpoint (DuplicatePlaceService::merge).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('places', function (Blueprint $table) {
            $table->foreignId('merged_into_id')->nullable()->constrained('places')->nullOnDelete();
            $table->timestamp('merged_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('places', function (Blueprint $table) {
            $table->dropConstrainedForeignId('merged_into_id');
            $table->dropColumn('merged_at');
        });
    }
};
