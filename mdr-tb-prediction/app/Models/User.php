<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Admin mengelola akun tenaga medis dan data rekam medis.
     * Tenaga medis menginput data pasien dan melihat hasil klasifikasi.
     */
    public const ROLE_ADMIN = 'admin';

    public const ROLE_TENAGA_MEDIS = 'tenaga_medis';

    public const ROLES = [
        self::ROLE_ADMIN => 'Admin',
        self::ROLE_TENAGA_MEDIS => 'Tenaga Medis',
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isTenagaMedis(): bool
    {
        return $this->role === self::ROLE_TENAGA_MEDIS;
    }

    public function roleLabel(): string
    {
        return self::ROLES[$this->role] ?? self::ROLES[self::ROLE_TENAGA_MEDIS];
    }

    /**
     * @return HasMany<Prediction, $this>
     */
    public function predictions(): HasMany
    {
        return $this->hasMany(Prediction::class);
    }
}
