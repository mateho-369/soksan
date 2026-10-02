<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 hardening (2.3) — Khmer + English search indexes.
 *
 * Enables pg_trgm and adds GIN trigram indexes over the searchable post
 * columns so ILIKE '%term%' filters can use an index instead of a
 * sequential scan. Trigrams are script-agnostic, which is exactly what
 * Khmer (no word spaces, no case) needs alongside English.
 *
 * SQLite test databases skip the extension and indexes; LIKE still works.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX IF NOT EXISTS posts_caption_trgm_idx ON posts USING gin (caption gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS posts_location_name_trgm_idx ON posts USING gin (location_name gin_trgm_ops)');
        DB::statement('CREATE INDEX IF NOT EXISTS posts_province_trgm_idx ON posts USING gin (province gin_trgm_ops)');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS posts_province_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS posts_location_name_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS posts_caption_trgm_idx');
    }
};
