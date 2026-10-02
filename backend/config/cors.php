<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing
    |--------------------------------------------------------------------------
    | Restricted to known origins. Configure FRONTEND_URL (and optionally
    | ADMIN_FRONTEND_URL later) in the environment — never hardcode here.
    */

    'paths' => ['api/*', 'up'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        env('FRONTEND_URL'),
        env('ADMIN_FRONTEND_URL'),
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
