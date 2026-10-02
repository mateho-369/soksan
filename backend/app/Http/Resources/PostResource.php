<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $exact = $viewer !== null && $viewer->can('viewExactLocation', $this->resource);

        return [
            'id' => $this->id,
            'category' => $this->category,
            'location_name' => $this->location_name,
            'province' => $this->province,
            'caption' => $this->caption,
            'status' => $this->status,
            // Phase 0 hardening — location privacy. Public viewers receive
            // coordinates rounded to the post's precision; owner/admin get
            // the exact point (PostPolicy::viewExactLocation). The raw
            // PostGIS point is never serialized.
            'latitude' => $exact ? $this->latitude : $this->publicLatitude(),
            'longitude' => $exact ? $this->longitude : $this->publicLongitude(),
            'has_exact_location' => $exact && $this->latitude !== null,
            'is_sensitive_location' => (bool) $this->is_sensitive_location,
            'location_precision' => (int) ($this->location_precision ?? 4),
            // Phase 1 (2.2) — distance from the nearby-search center point;
            // only present on /posts/nearby responses.
            'distance_km' => $this->when($this->distance_km !== null, fn () => (float) $this->distance_km),
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
