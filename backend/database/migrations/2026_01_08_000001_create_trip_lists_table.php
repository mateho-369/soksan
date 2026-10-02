<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 6 — Trip Planner. Users collect published posts into shareable
 * trip lists. A public slug makes every list linkable; item order is
 * explicit (sort_order) so a trip reads like an itinerary.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trip_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique(); // public share key
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(true);
            $table->timestamps();
        });

        Schema::create('trip_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_list_id')->constrained('trip_lists')->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['trip_list_id', 'post_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_list_items');
        Schema::dropIfExists('trip_lists');
    }
};
