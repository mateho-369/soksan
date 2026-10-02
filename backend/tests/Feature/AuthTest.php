<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_requires_valid_input(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'D',
            'email' => 'not-an-email',
            'password' => 'short',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_register_creates_user_with_user_role_and_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Dara Sok',
            'email' => 'dara@example.com',
            'password' => 'averysecret1',
            'password_confirmation' => 'averysecret1',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('users', ['email' => 'dara@example.com']);
        $user = User::where('email', 'dara@example.com')->first();
        $this->assertTrue($user->hasRole('user'));
        $this->assertFalse($user->hasRole('admin'));
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Someone',
            'email' => 'dup@example.com',
            'password' => 'averysecret1',
            'password_confirmation' => 'averysecret1',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_login_rejects_bad_credentials(): void
    {
        User::factory()->create(['email' => 'dara@example.com', 'password' => 'averysecret1']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'dara@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJson(['message' => 'Email or password is incorrect.']);
    }

    public function test_login_returns_token(): void
    {
        User::factory()->create(['email' => 'dara@example.com', 'password' => 'averysecret1']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'dara@example.com',
            'password' => 'averysecret1',
        ])->assertStatus(200)->assertJsonStructure(['token', 'user']);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')->assertStatus(401);
    }

    public function test_me_returns_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_logout_invalidates_the_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/me')
            ->assertStatus(401);
    }
}
