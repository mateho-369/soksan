FROM php:8.3-cli-alpine

# PHP extensions required by Laravel + PostgreSQL.
RUN apk add --no-cache icu-dev libzip-dev postgresql-dev oniguruma-dev linux-headers $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring zip intl bcmath \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/api

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

RUN chmod +x artisan docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker/entrypoint.sh"]
