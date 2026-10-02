#!/bin/sh
set -e

# Generate an app key on first boot when none was provided.
if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force --ansi
fi

# Wait for PostgreSQL to accept connections (PDO-based, no extra tooling).
php -r '
$tries = 30;
while ($tries > 0) {
    try {
        new PDO(
            sprintf("pgsql:host=%s;port=%s;dbname=%s", getenv("DB_HOST") ?: "db", getenv("DB_PORT") ?: "5432", getenv("DB_DATABASE") ?: "soksan"),
            getenv("DB_USERNAME") ?: "soksan",
            getenv("DB_PASSWORD") ?: "soksan-dev"
        );
        break;
    } catch (Throwable $e) {
        $tries--;
        if ($tries === 0) { fwrite(STDERR, "Database never became ready\n"); exit(1); }
        sleep(2);
    }
}
'

# Worker containers (APP_ROLE=worker) run queue workers instead of the HTTP
# server. They wait for Redis because the queue connection needs it.
if [ "$APP_ROLE" = "worker" ]; then
  php -r '
  $tries = 30;
  while ($tries > 0) {
    $socket = @fsockopen(getenv("REDIS_HOST") ?: "redis", (int) (getenv("REDIS_PORT") ?: 6379), $errno, $errstr, 1);
    if ($socket) { fclose($socket); exit(0); }
    $tries--; sleep(2);
  }
  fwrite(STDERR, "Redis never became ready\n"); exit(1);
  '
  exec php artisan queue:work redis --queue=moderation,default --tries=3 --backoff=30 --max-time=3600
fi

php artisan migrate --force --ansi
php artisan storage:link --ansi >/dev/null 2>&1 || true

if [ "$SEED_DEMO" = "true" ]; then
  php artisan db:seed --force --ansi
fi

exec php artisan serve --host=0.0.0.0 --port=8000
