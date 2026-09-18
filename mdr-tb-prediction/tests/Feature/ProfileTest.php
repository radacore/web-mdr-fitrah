<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_halaman_profil_dapat_diakses(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/profile')
            ->assertOk();
    }

    public function test_informasi_profil_dapat_diperbarui(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch('/profile', [
                'name' => 'Tenaga Medis Baru',
                'email' => 'tenagamedis.baru@mdrtb.test',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Tenaga Medis Baru', $user->name);
        $this->assertSame('tenagamedis.baru@mdrtb.test', $user->email);
    }

    public function test_email_yang_sudah_terpakai_ditolak(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();

        $this->actingAs($user)
            ->from('/profile')
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $lain->email,
            ])
            ->assertSessionHasErrors('email');
    }

    /**
     * Penghapusan akun sendiri tidak disediakan. Pengelolaan akun sepenuhnya
     * menjadi wewenang admin melalui menu Manajemen Akun (Gambar 6).
     */
    public function test_akun_tidak_dapat_dihapus_oleh_pemiliknya(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete('/profile')
            ->assertStatus(405);

        $this->assertNotNull($user->fresh());
    }
}
