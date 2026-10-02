<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category')->index();
            $table->string('location_name');
            $table->string('province')->index();
            $table->text('caption')->nullable();
            // Moderation hook for the future admin panel; user posts go live.
            $table->string('status')->default('published')->index();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 11, 7)->nullable();

            // PostGIS spatial column for geo queries (map clustering,
            // "near me"). On non-Postgres drivers (e.g. SQLite in tests)
            // it degrades to a plain text column.
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                $table->geometry('location_point', subtype: 'point', srid: 4326)->nullable();
            } else {
                $table->text('location_point')->nullable();
            }
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
