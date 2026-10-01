<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 hardening (2.2) — spatial index for "near me" queries.
 *
 * The GIST index is built on the geography cast so ST_DWithin distance
 * queries use metres on the spheroid without a per-row cast. Only created
 * on Postgres/PostGIS; SQLite test databases skip it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE INDEX IF NOT EXISTS posts_location_point_geog_idx ON posts USING gist ((location_point::geography))');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS posts_location_point_geog_idx');
    }
};
