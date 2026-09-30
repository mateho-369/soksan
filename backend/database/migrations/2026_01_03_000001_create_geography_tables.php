<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cambodia administrative hierarchy: Commune/Sangkat -> District/Khan ->
 * Province -> Country. Schema is import-ready: surrogate ids plus a unique
 * official `code` column per level, so the full national dataset (~1,600
 * communes) can be imported later without redesign — upsert by code.
 *
 * Country is intentionally implicit ('KH') until multi-country exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable()->unique(); // official code (import key)
            $table->string('name');
            $table->string('name_kh')->nullable();
            $table->string('icon', 8)->nullable();
            $table->timestamps();

            $table->index('name');
        });

        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->string('code')->nullable()->unique();
            $table->string('name');
            $table->string('name_kh')->nullable();
            $table->timestamps();

            $table->index(['province_id', 'name']);
        });

        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->string('code')->nullable()->unique();
            $table->string('name');
            $table->string('name_kh')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 11, 7)->nullable();
            $table->timestamps();

            $table->index(['district_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
        Schema::dropIfExists('districts');
        Schema::dropIfExists('provinces');
    }
};
