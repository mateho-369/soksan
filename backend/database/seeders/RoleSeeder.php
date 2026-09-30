<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Baseline roles. `admin` unlocks the in-app admin panel (Phase 5) via the
 * role:admin middleware; grant it with:
 *   $user->roles()->attach(Role::where('name', 'admin')->first());
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'user', 'display_name' => 'Member'],
            ['name' => 'admin', 'display_name' => 'Administrator'],
        ] as $role) {
            Role::query()->updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
