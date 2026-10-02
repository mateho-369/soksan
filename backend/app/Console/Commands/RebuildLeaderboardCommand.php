<?php

namespace App\Console\Commands;

use App\Services\LeaderboardService;
use Illuminate\Console\Command;

class RebuildLeaderboardCommand extends Command
{
    protected $signature = 'leaderboard:rebuild';

    protected $description = 'Recompute the province leaderboard from Postgres (drift correction)';

    public function handle(LeaderboardService $leaderboard): int
    {
        $leaderboard->rebuild();

        $this->info('Leaderboard rebuilt from Postgres.');

        return self::SUCCESS;
    }
}
