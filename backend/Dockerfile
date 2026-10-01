FROM php:8.3-cli-alpine

# PHP extensions required by Laravel + PostgreSQL.
# GD + image libraries back SafeMediaService: every uploaded image is
# re-encoded (EXIF/GPS stripped, dimensions capped) before storage.
RUN apk add --no-cache icu-dev libzip-dev postgresql-dev oniguruma-dev linux-headers \
    libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring zip intl bcmath gd \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/api

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

RUN chmod +x artisan docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker/entrypoint.sh"]
