<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Places/posts are tagged to their COMMUNE; district and province are
 * denormalized on write (see App\Services\GeoService) so ranking filters
 * never need multi-hop joins. The legacy free-text `province` column stays
 * for pre-geography posts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('commune_id')->nullable()->after('province')
                ->constrained()->nullOnDelete();
            $table->foreignId('district_id')->nullable()->after('commune_id')
                ->constrained()->nullOnDelete();
            $table->foreignId('geo_province_id')->nullable()->after('district_id')
                ->constrained('provinces')->nullOnDelete();

            $table->index('commune_id');
            $table->index('geo_province_id');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('commune_id');
            $table->dropConstrainedForeignId('district_id');
            $table->dropConstrainedForeignId('geo_province_id');
        });
    }
};
