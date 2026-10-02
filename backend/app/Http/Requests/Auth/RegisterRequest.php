<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'string', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
            // Phase 8 — badge-only referral; unknown/absent codes are ignored.
            'referral_code' => ['nullable', 'string', 'max:12'],
        ];
    }
}
