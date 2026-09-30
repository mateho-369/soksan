<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        // Commune tagging: district/province are derived server-side.

        return [
            'category' => ['required', 'string', 'max:60'],
            'location_name' => ['required', 'string', 'min:2', 'max:120'],
            'province' => ['required', 'string', 'max:60'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            // Media entries reference files previously stored via /uploads.
            'media' => ['nullable', 'array', 'max:10'],
            'media.*.media_url' => ['required_with:media', 'string', 'max:2048'],
            'media.*.media_type' => ['required_with:media', 'string', 'in:image,video'],
            'media.*.duration_seconds' => ['nullable', 'integer', 'min:0', 'max:300'],
        ];
    }
}
