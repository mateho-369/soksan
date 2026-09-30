<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(private readonly ReferralService $referrals)
    {
    }

    /**
     * Create an account, attach the default "user" role, and issue a token.
     * Optionally link the signup to a referral code (Phase 8, badge-only).
     *
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $referredBy = isset($data['referral_code'])
            ? $this->referrals->resolve((string) $data['referral_code'])
            : null;

        $user = DB::transaction(function () use ($data, $referredBy) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'], // hashed via the model cast
                'referred_by_user_id' => $referredBy?->id,
            ]);
            $user->forceFill(['referral_code' => $this->referrals->generateCode()])->save();
            $user->assignRole('user');

            return $user;
        });

        return ['user' => $user, 'token' => $user->createToken('api')->plainTextToken];
    }

    /**
     * @return array{user: User, token: string}|null null when credentials fail
     */
    public function login(string $email, string $password): ?array
    {
        $user = User::where('email', $email)->where('is_active', true)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            return null;
        }

        return ['user' => $user, 'token' => $user->createToken('api')->plainTextToken];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }
}
