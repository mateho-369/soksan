<?php

use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Processor\PsrLogMessageProcessor;

/*
|--------------------------------------------------------------------------
| Log channels — Phase 2/3 hardening
|--------------------------------------------------------------------------
|
| Production should run LOG_CHANNEL=json: structured, rotated JSON lines
| that our own ops tooling can tail. No third-party logging service.
|
| Policy (enforced in review, restated in docs/OPERATIONS.md):
|   - never log passwords, tokens, reset links or payment payloads;
|   - never log raw coordinates or precise locations;
|   - request logs carry user IDs, never email addresses.
*/

return [

    'default' => env('LOG_CHANNEL', 'stack'),

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace' => env('LOG_DEPRECATIONS_TRACE', false),
    ],

    'channels' => [

        'stack' => [
            'driver' => 'stack',
            'channels' => explode(',', env('LOG_STACK_CHANNELS', 'single')),
            'ignore_exceptions' => false,
        ],

        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => (int) env('LOG_DAILY_DAYS', 14),
            'replace_placeholders' => true,
        ],

        // Structured production logging: one JSON object per line, 14-day
        // rotation, no external sinks.
        'json' => [
            'driver' => 'monolog',
            'handler' => RotatingFileHandler::class,
            'path' => storage_path('logs/soksan.json'),
            'level' => env('LOG_LEVEL', 'info'),
            'days' => (int) env('LOG_DAILY_DAYS', 14),
            'formatter' => JsonFormatter::class,
            'formatter_with' => [
                'batchMode' => JsonFormatter::BATCH_MODE_NEWLINES,
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'with' => ['stream' => 'php://stderr'],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'syslog' => [
            'driver' => 'syslog',
            'level' => env('LOG_LEVEL', 'debug'),
            'facility' => env('LOG_SYSLOG_FACILITY', LOG_USER),
            'replace_placeholders' => true,
        ],

        'errorlog' => [
            'driver' => 'errorlog',
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'null' => [
            'driver' => 'monolog',
            'handler' => \Monolog\Handler\NullHandler::class,
        ],

        'emergency' => [
            'path' => storage_path('logs/laravel.log'),
        ],

    ],

];
