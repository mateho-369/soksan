<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'media_url' => $this->url,
            'media_type' => $this->type,
            'sort_order' => $this->sort_order,
            'duration_seconds' => $this->duration_seconds,
        ];
    }
}
