<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scaling-plan schedulers (stage 2+):
// - view counters batch-flush from Redis to Postgres once a minute,
// - the province leaderboard drift-corrects from Postgres every 15 min.
// Requires the cron entry documented in the README
// (* * * * * php artisan schedule:run).
Schedule::command('counters:flush')->everyMinute()->withoutOverlapping();
Schedule::command('leaderboard:rebuild')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('rankings:rebuild')->hourly()->withoutOverlapping();
