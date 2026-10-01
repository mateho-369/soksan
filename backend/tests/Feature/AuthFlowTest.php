<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Phase 0 hardening — password recovery, email verification and account
 * deletion through the HTTP layer.
 */
class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_does_not_leak_account_existence(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertStatus(200);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
            ->assertStatus(200);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_revokes_all_sessions(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertStatus(200);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'brand-new-password-1',
            'password_confirmation' => 'brand-new-password-1',
        ])->assertStatus(200);

        // Every previously issued token is gone.
        $this->assertSame(0, $user->tokens()->count());
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('brand-new-password-1', $user->refresh()->password));
    }

    public function test_verification_notification_and_signed_url(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/email/verification-notification')
            ->assertStatus(200);
        Notification::assertSentTo($user, VerifyEmail::class);

        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification())]
        );

        $this->getJson($url)->assertStatus(200);
        $this->assertTrue($user->refresh()->hasVerifiedEmail());
    }

    public function test_account_deletion_requires_password_and_anonymizes(): void
    {
        $user = User::factory()->create(['password' => 'soksan-password-1']);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/me', ['password' => 'wrong'])
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/me', ['password' => 'soksan-password-1'])
            ->assertStatus(200);

        $fresh = $user->refresh();
        $this->assertFalse((bool) $fresh->is_active);
        $this->assertNotSame('soksan-password-1', $fresh->password);
        $this->assertSame('deleted-'.$fresh->id.'@deleted.invalid', $fresh->email);
        $this->assertSame(0, $fresh->tokens()->count());
    }

    public function test_password_reset_is_rate_limited(): void
    {
        $email = 'probe@example.com';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/forgot-password', ['email' => $email]);
        }

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])
            ->assertStatus(429);
    }
}
