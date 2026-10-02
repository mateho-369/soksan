<?php

/*
|--------------------------------------------------------------------------
| Third-party services
|--------------------------------------------------------------------------
| Google Places is used ONLY for the one-time business-registration
| confirmation (PlacesService). Public map rendering never touches Google
| tiles — that stays on OpenFreeMap / self-hosted PMTiles.
*/

return [
    'google_places' => [
        'key' => env('GOOGLE_PLACES_API_KEY'),
    ],

    // Bakong KHQR billing (Phase 3). Without a key the service issues demo
    // invoices and refuses activation unless allow_demo_confirm is true.
    'bakong' => [
        'key' => env('BAKONG_API_KEY'),
        'url' => env('BAKONG_API_URL', 'https://api.bakong.gov.kh'),
        'merchant_id' => env('BAKONG_MERCHANT_ID'),
        'allow_demo_confirm' => env('BAKONG_ALLOW_DEMO_CONFIRM', false),
    ],
];
