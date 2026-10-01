<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

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

    /* ---- Phase 0 hardening: recovery, verification, deletion ---------- */

    /**
     * Send a password reset link via the Laravel Password broker. Always
     * returns the broker status; the controller maps it to a response that
     * does not leak whether the email exists.
     */
    public function sendResetLink(string $email): string
    {
        return Password::sendResetLink(['email' => $email]);
    }

    /**
     * Consume a reset token, change the password and REVOKE every existing
     * Sanctum token so a stolen session cannot survive recovery.
     *
     * @param  array{email: string, token: string, password: string}  $data
     */
    public function resetPassword(array $data): string
    {
        return Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password, // hashed via the model cast
                'remember_token' => Str::random(60),
            ])->save();

            $user->tokens()->delete();

            event(new PasswordReset($user));
        });
    }

    /**
     * Mark the account verified (signed URL flow).
     */
    public function verifyEmail(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $user->markEmailAsVerified();
        event(new Verified($user));
    }

    /**
     * Account deletion. Requires the current password. We do NOT hard
     * delete: posts/comments/reports stay for moderation and audit
     * retention, while the identity itself is anonymized immediately and
     * every session is revoked. (Retention policy: docs/OPERATIONS.md.)
     */
    public function deleteAccount(User $user, string $password): void
    {
        abort_unless(Hash::check($password, $user->password), 422, 'The password is incorrect.');

        DB::transaction(function () use ($user) {
            // Revoke every session first.
            $user->tokens()->delete();

            $user->forceFill([
                'is_active' => false,
                'name' => 'Deleted user',
                'name_kh' => null,
                'email' => 'deleted-'.$user->id.'@deleted.invalid',
                'avatar_url' => null,
                'bio' => null,
                'password' => Str::random(40), // unusable hash
            ])->save();
        });
    }
}
