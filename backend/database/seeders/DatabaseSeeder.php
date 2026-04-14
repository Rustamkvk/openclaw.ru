<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $adminRole = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrator', 'description' => 'System administrator']
        );
        $userRole = Role::firstOrCreate(
            ['slug' => 'user'],
            ['name' => 'User', 'description' => 'Regular user']
        );

        $permissions = [
            ['slug' => 'users.manage', 'name' => 'Manage users'],
            ['slug' => 'logs.view', 'name' => 'View logs'],
            ['slug' => 'agents.monitor', 'name' => 'Monitor agents'],
        ];

        foreach ($permissions as $item) {
            $permission = Permission::firstOrCreate(['slug' => $item['slug']], ['name' => $item['name']]);
            if (!$adminRole->permissions->contains($permission->id)) {
                $adminRole->permissions()->attach($permission->id);
            }
        }

        User::firstOrCreate(
            ['email' => 'admin@openclaw.local'],
            [
                'name' => 'Admin',
                'password' => Hash::make('Admin123!'),
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'user@openclaw.local'],
            [
                'name' => 'User',
                'password' => Hash::make('User12345!'),
                'role_id' => $userRole->id,
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'rus@openclaw.local'],
            [
                'name' => 'rus',
                'password' => Hash::make('14725836'),
                'role_id' => $userRole->id,
                'is_active' => true,
            ]
        );
    }
}
