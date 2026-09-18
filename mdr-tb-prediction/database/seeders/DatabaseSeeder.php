<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun admin yang mengelola akun tenaga medis dan data rekam medis
        User::firstOrCreate(
            ['email' => 'admin@mdrtb.test'],
            [
                'name' => 'Administrator',
                'password' => 'password',
                'role' => User::ROLE_ADMIN,
            ]
        );

        // Akun tenaga medis yang menginput data pasien dan melihat hasil klasifikasi
        User::firstOrCreate(
            ['email' => 'tenagamedis@mdrtb.test'],
            [
                'name' => 'Tenaga Medis',
                'password' => 'password',
                'role' => User::ROLE_TENAGA_MEDIS,
            ]
        );

        $this->call(TrainingDataSeeder::class);
    }
}
