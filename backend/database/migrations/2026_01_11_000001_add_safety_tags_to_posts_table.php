<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 9 — safety & accessibility tags.
     *
     * Self-reported by the author at publish time from a closed allow-list
     * (App\Services\SafetyTagService). Stored as jsonb so the catalog can
     * grow without another migration; defaults to an empty list.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->jsonb('safety_tags')->default('[]');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('safety_tags');
        });
    }
};
