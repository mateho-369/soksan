<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'location_name' => $this->location_name,
            'province' => $this->province,
            'caption' => $this->caption,
            'status' => $this->status,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'media' => MediaResource::collection($this->whenLoaded('media')),
            'author' => new UserResource($this->whenLoaded('author')),
            'like_count' => (int) $this->whenCounted('likes', 0),
            'comment_count' => (int) $this->whenCounted('comments', 0),
            // Boolean flags for the signed-in viewer (added by PostService).
            'is_liked' => (bool) ($this->is_liked ?? false),
            'is_saved' => (bool) ($this->is_saved ?? false),
            'created_at' => $this->created_at,
        ];
    }
}
