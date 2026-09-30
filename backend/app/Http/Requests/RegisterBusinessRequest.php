<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'name_kh' => ['nullable', 'string', 'max:160'],
            'category' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:40'],
            // Confirmed place (Phase 2). place_name fallback for manual pins.
            'place_id' => ['nullable', 'integer', 'exists:places,id'],
            'place_name' => ['nullable', 'string', 'max:160'],
        ];
    }
}
