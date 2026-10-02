<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 7 — public Collections. Unlike trip lists (personal itineraries
 * with an optional share link), collections are PUBLIC community curation:
 * browsable by everyone, only the owner may mutate them, and only
 * published posts can be collected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('collection_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['collection_id', 'post_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_posts');
        Schema::dropIfExists('collections');
    }
};
