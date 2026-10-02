<?php

namespace App\Http\Requests;

use App\Services\SafetyTagService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'caption' => ['sometimes', 'nullable', 'string', 'max:2200'],
            'location_name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'province' => ['sometimes', 'string', 'max:60'],
            'category' => ['sometimes', 'string', 'max:60'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            // Phase 9 — safety & accessibility tags: closed allow-list only.
            'safety_tags' => ['sometimes', 'nullable', 'array', 'max:8'],
            'safety_tags.*' => ['string', Rule::in(SafetyTagService::allowed())],
        ];
    }
}
