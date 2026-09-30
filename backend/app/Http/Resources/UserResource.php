<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_kh' => $this->name_kh,
            'email' => $this->when($request->user()?->id === $this->id, $this->email),
            'avatar_url' => $this->avatar_url,
            'bio' => $this->bio,
            'verified' => $this->email_verified_at !== null,
        ];
    }
}
