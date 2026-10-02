<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 0 hardening — real user reporting (posts and comments).
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            // Nullable: reports survive reporter account deletion so the
            // moderation history stays auditable.
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->morphs('reportable'); // post | comment
            $table->string('reason', 40)->index();
            $table->text('details')->nullable();
            $table->string('status', 20)->default('pending')->index(); // pending|approved|rejected|dismissed
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // One report per reporter per item.
            $table->unique(['reporter_id', 'reportable_type', 'reportable_id'], 'reports_one_per_reporter');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
