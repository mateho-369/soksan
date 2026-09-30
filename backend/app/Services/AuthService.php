<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Create an account, attach the default "user" role, and issue a token.
     *
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'], // hashed via the model cast
            ]);
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
