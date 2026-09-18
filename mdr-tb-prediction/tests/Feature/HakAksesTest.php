<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pembatasan akses sesuai dua aktor sistem (Gambar 6):
 * admin mengelola akun dan data rekam medis serta menjalankan pengujian model,
 * sedangkan tenaga medis hanya menginput data pasien dan melihat hasilnya.
 */
class HakAksesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, string}>
     */
    public static function ruteAdmin(): array
    {
        return [
            'daftar akun' => ['get', '/users'],
            'tambah akun' => ['get', '/users/create'],
            'data rekam medis' => ['get', '/training-data'],
            'tambah data rekam medis' => ['get', '/training-data/create'],
            'pembersihan data' => ['get', '/training-data/cleaning'],
            'pengujian smote' => ['get', '/prediction/compare-smote'],
            'skenario pengujian' => ['get', '/prediction/test-scenarios'],
            'api pelatihan ulang' => ['post', '/api/retrain'],
            'api pengujian smote' => ['post', '/api/compare-smote'],
            'api skenario pengujian' => ['post', '/api/test-scenarios'],
        ];
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function ruteTerautentikasi(): array
    {
        return [
            'dashboard' => ['get', '/dashboard'],
            'klasifikasi' => ['get', '/prediction'],
            'riwayat' => ['get', '/prediction/history'],
            'profil' => ['get', '/profile'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('ruteTerautentikasi')]
    public function test_tamu_diarahkan_ke_halaman_masuk(string $metode, string $url): void
    {
        $this->{$metode}($url)->assertRedirect('/login');
    }

    public function test_halaman_awal_diarahkan_ke_halaman_masuk(): void
    {
        $this->get('/')->assertRedirect('/login');
    }

    public function test_pendaftaran_mandiri_tidak_tersedia(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register')->assertNotFound();
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('ruteAdmin')]
    public function test_tenaga_medis_tidak_dapat_mengakses_fitur_admin(string $metode, string $url): void
    {
        $tenagaMedis = User::factory()->create();

        $this->actingAs($tenagaMedis)
            ->{$metode}($url)
            ->assertForbidden();
    }

    public function test_admin_dapat_mengakses_pengelolaan_akun(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->get('/users')->assertOk();
        $this->actingAs($admin)->get('/training-data')->assertOk();
    }

    public function test_tenaga_medis_hanya_melihat_riwayat_miliknya(): void
    {
        $admin = User::factory()->admin()->create();
        $tenagaMedis = User::factory()->create();

        $milikAdmin = $admin->predictions()->create([
            'slug' => 'pasien-admin',
            'patient_data' => ['nama_lengkap' => 'Pasien Admin', 'ket_usia' => 40],
            'prediction_result' => 'Berhasil',
            'model_used' => 'Random Forest',
            'confidence_score' => 90.0,
            'probabilities' => ['Berhasil' => 90.0, 'Tidak Berhasil' => 10.0],
        ]);

        $this->actingAs($tenagaMedis)
            ->get('/prediction/'.$milikAdmin->id)
            ->assertForbidden();

        $this->actingAs($admin)
            ->get('/prediction/'.$milikAdmin->id)
            ->assertOk();
    }

    public function test_admin_terakhir_tidak_dapat_diturunkan_perannya(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->from('/users/'.$admin->id.'/edit')
            ->put('/users/'.$admin->id, [
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => User::ROLE_TENAGA_MEDIS,
            ])
            ->assertSessionHasErrors('role');

        $this->assertTrue($admin->fresh()->isAdmin());
    }

    public function test_admin_tidak_dapat_menghapus_akunnya_sendiri(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->from('/users')
            ->delete('/users/'.$admin->id)
            ->assertSessionHasErrors();

        $this->assertNotNull($admin->fresh());
    }
}
