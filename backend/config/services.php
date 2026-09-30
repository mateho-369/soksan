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
];
