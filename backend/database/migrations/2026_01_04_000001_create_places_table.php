<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 — confirmed places.
 *
 * A "place" is a location that has been fixed once and can be referenced
 * by posts and (Phase 3) businesses. Two sources:
 *   - google_places: confirmed ONE time at business registration via the
 *     Google Places API (the only permitted Google usage; it never renders
 *     maps publicly). place_id is stored so the confirmation is permanent.
 *   - manual: a regular user dropped a pin on the map (no external check).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('places', function (Blueprint $table) {
            $table->id();
            $table->enum('source', ['google_places', 'manual'])->default('manual');
            // Google Place IDs are stable identifiers; unique so a business
            // can only ever be confirmed against a given place once.
            $table->string('place_id', 191)->nullable()->unique();
            $table->string('name');
            $table->string('formatted_address')->nullable();
            // 7 decimal places ~= 1 cm precision, more than enough for pins.
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->foreignId('confirmed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['lat', 'lng']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('places');
    }
};
