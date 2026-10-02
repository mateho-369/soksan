<?php

namespace App\Console\Commands;

use App\Services\CounterService;
use Illuminate\Console\Command;

class FlushCountersCommand extends Command
{
    protected $signature = 'counters:flush';

    protected $description = 'Batch-apply pending Redis view counters to Postgres';

    public function handle(CounterService $counters): int
    {
        $updated = $counters->flush();

        $this->info("Flushed view counters for {$updated} post(s).");

        return self::SUCCESS;
    }
}
