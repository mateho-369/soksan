<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 — posts may reference a confirmed place. The posts table already
 * has latitude/longitude (and a PostGIS location_point); this link connects
 * a post to a one-time Google Places confirmation when one exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('place_id')->nullable()->after('longitude')->constrained('places')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('place_id');
        });
    }
};
