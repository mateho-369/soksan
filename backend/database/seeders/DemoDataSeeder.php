<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $dara = User::factory()->create([
            'name' => 'Dara Sok',
            'name_kh' => 'ដារ៉ា សុខ',
            'email' => 'dara@soksan.app',
        ]);
        $dara->assignRole('user');

        $admin = User::factory()->create([
            'name' => 'SokSan Admin',
            'email' => 'admin@soksan.app',
        ]);
        $admin->assignRole('admin');

        $vicheka = User::factory()->create([
            'name' => 'Vicheka Lim',
            'name_kh' => 'លឹម វិច្ឆិកា',
            'email' => 'vicheka@soksan.app',
        ]);
        $vicheka->assignRole('user');

        Post::factory()->create([
            'user_id' => $vicheka->id,
            'category' => 'hidden-gems',
            'location_name' => 'Chi Phat',
            'province' => 'Koh Kong',
            'caption' => 'We left before the village stirred and followed the river into a veil of morning mist.',
            'latitude' => 11.8369,
            'longitude' => 103.4703,
        ]);

        Post::factory()->create([
            'user_id' => $vicheka->id,
            'category' => 'aesthetic-cafes',
            'location_name' => 'Pech Chreada',
            'province' => 'Mondulkiri',
            'caption' => 'A tiny highland coffee table, morning mist, and beans grown a few hills away.',
            'latitude' => 12.4566,
            'longitude' => 107.1865,
        ]);
    }
}
