<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'category' => fake()->randomElement(['hidden-gems', 'aesthetic-cafes', 'eco-resorts', 'trip-stories']),
            'location_name' => fake()->city(),
            'province' => fake()->randomElement(['Kampot', 'Koh Kong', 'Mondulkiri', 'Siem Reap']),
            'caption' => fake()->sentence(12),
            'status' => 'published',
        ];
    }
}
