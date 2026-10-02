<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 0 hardening — location privacy controls.
     *
     * Exact coordinates are sensitive on a location-based social product.
     * The PostGIS point stays exact INTERNALLY (nearby search); what the
     * API exposes publicly is rounded to `location_precision` decimals:
     * 4 ≈ 11m, 3 ≈ 110m, 2 ≈ 1.1km. Owners/admins see exact coordinates
     * (PostPolicy::viewExactLocation).
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->unsignedTinyInteger('location_precision')->default(4)
                ->comment('Public decimal precision: 4 ~= 11m, 3 ~= 110m, 2 ~= 1.1km');
            $table->boolean('is_sensitive_location')->default(false);
            $table->boolean('show_exact_location_to_owner_only')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['location_precision', 'is_sensitive_location', 'show_exact_location_to_owner_only']);
        });
    }
};
