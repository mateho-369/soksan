<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 5 — Hidden Gem of the Week. An admin picks ONE published post per
 * ISO week; the public feed/banner shows the current pick. Picks are
 * editorial — they never alter ranking scores.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_hidden_gems', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->date('week_start'); // Monday of the feature week
            $table->string('note')->nullable();
            $table->foreignId('picked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('week_start');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_hidden_gems');
    }
};
