<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\HiddenGemService;
use Illuminate\Http\JsonResponse;

/** Public read of this week's editorial pick. */
class HiddenGemController extends Controller
{
    public function __construct(private readonly HiddenGemService $hiddenGems)
    {
    }

    public function current(): JsonResponse
    {
        $gem = $this->hiddenGems->current();

        return response()->json($gem ? $gem->load('post') : ['current' => null]);
    }
}
