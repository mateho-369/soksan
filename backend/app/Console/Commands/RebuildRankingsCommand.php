<?php

namespace App\Console\Commands;

use App\Services\RankingService;
use Illuminate\Console\Command;

class RebuildRankingsCommand extends Command
{
    protected $signature = 'rankings:rebuild';

    protected $description = 'Recompute geography rankings (commune/district/province) with recency decay';

    public function handle(RankingService $rankings): int
    {
        $rankings->rebuild();

        $this->info('Geography rankings rebuilt.');

        return self::SUCCESS;
    }
}
