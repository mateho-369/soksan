<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->auth->register($request->validated());

        return response()->json([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login($request->validated('email'), $request->validated('password'));

        if (! $result) {
            return response()->json(['message' => 'Email or password is incorrect.'], 422);
        }

        return response()->json([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource($request->user()));
    }

    /* ---- Phase 0 hardening: recovery, verification, deletion ---------- */

    /** POST /api/v1/auth/forgot-password — never leaks account existence. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $this->auth->sendResetLink($request->string('email')->value());

        // Same message whether or not the email exists (anti-enumeration).
        return response()->json(['message' => 'If that account exists, a reset link has been sent.']);
    }

    /** POST /api/v1/auth/reset-password — rotates password, revokes tokens. */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = $this->auth->resetPassword($validated);

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'The reset link is invalid or has expired.'], 422);
        }

        return response()->json(['message' => 'Password reset. All other sessions were signed out.']);
    }

    /** POST /api/v1/email/verification-notification — resend verification. */
    public function sendVerificationNotification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent.']);
    }

    /** GET /api/v1/email/verify/{id}/{hash} — signed route. */
    public function verifyEmail(Request $request, User $user): JsonResponse
    {
        abort_unless($request->hasValidSignature(), 403, 'Invalid verification link.');
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), (string) $request->route('hash')), 403, 'Invalid verification link.');

        $this->auth->verifyEmail($user);

        return response()->json(['message' => 'Email verified.']);
    }

    /** DELETE /api/v1/me — account deletion, requires current password. */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);

        $this->auth->deleteAccount($request->user(), $request->string('password')->value());

        return response()->json(['message' => 'Your account has been deactivated and anonymized.']);
    }
}
