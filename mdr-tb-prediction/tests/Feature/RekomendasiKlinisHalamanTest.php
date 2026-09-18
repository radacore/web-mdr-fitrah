<?php

namespace Tests\Feature;

use App\Models\Prediction;
use App\Models\TrainingData;
use App\Models\User;
use App\Services\RekomendasiKlinis;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Selain label klasifikasi, tenaga medis harus menerima rekomendasi tindakan
 * penanganan pada halaman hasil (Gambar 6 dan Gambar 7, Bab II.A.20).
 */
class RekomendasiKlinisHalamanTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $penyesuaian
     * @return array<string, mixed>
     */
    private function dataPasien(array $penyesuaian = []): array
    {
        return array_merge([
            'ket_usia' => 55,
            'usia' => TrainingData::USIA_LANJUT,
            'jenis_kelamin' => 'Laki-Laki',
            'status_bekerja' => 'Bekerja',
            'bb' => 40,
            'tb' => 170,
            'imt' => 13.84,
            'status_gizi' => 'Gizi Kurang',
            'status_merokok' => 'Tidak Merokok',
            'pemeriksaan_kontak' => 'Ya',
            'riwayat_dm' => 'Tidak',
            'riwayat_hiv' => 'Tidak',
            'komorbiditas' => 'Tidak Ada',
            'kepatuhan_minum_obat' => 'Tidak Patuh',
            'efek_samping_obat' => 'Tidak Ada Keluhan',
            'riwayat_pengobatan' => 'Kasus Lama',
            'panduan_pengobatan' => 'Jangka Pendek',
        ], $penyesuaian);
    }

    /**
     * @param  array<string, mixed>  $penyesuaian
     */
    private function buatRiwayat(User $user, string $hasil, array $penyesuaian = []): Prediction
    {
        return Prediction::create([
            'user_id' => $user->id,
            'slug' => 'UJI-'.uniqid(),
            'patient_data' => $this->dataPasien($penyesuaian),
            'prediction_result' => $hasil,
            'model_used' => 'Random Forest',
            'confidence_score' => 91.5,
            'probabilities' => ['Berhasil' => 8.5, 'Tidak Berhasil' => 91.5],
            'feature_importance' => null,
        ]);
    }

    public function test_halaman_detail_mengirim_rekomendasi_tindakan(): void
    {
        $user = User::factory()->create();
        $prediction = $this->buatRiwayat($user, 'Tidak Berhasil');

        $this->actingAs($user)
            ->get("/prediction/{$prediction->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Prediction/Show')
                ->has('rekomendasi.tindakan')
                ->where('rekomendasi.tingkat_risiko', RekomendasiKlinis::RISIKO_TINGGI)
            );
    }

    /**
     * Faktor risiko yang terekam pada data pasien harus muncul sebagai
     * tindakan, bukan hanya menjadi angka ringkasan.
     */
    public function test_faktor_risiko_pasien_muncul_sebagai_tindakan(): void
    {
        $user = User::factory()->create();
        $prediction = $this->buatRiwayat($user, 'Tidak Berhasil');

        $this->actingAs($user)
            ->get("/prediction/{$prediction->id}")
            ->assertOk()
            ->assertInertia(function ($page) {
                $faktor = array_column($page->toArray()['props']['rekomendasi']['tindakan'], 'faktor');

                $this->assertContains('Tidak patuh minum obat', $faktor);
                $this->assertContains('Riwayat pengobatan ulang', $faktor);
                $this->assertContains('Usia lanjut', $faktor);
            });
    }

    public function test_pasien_tanpa_faktor_risiko_berisiko_rendah(): void
    {
        $user = User::factory()->create();
        $prediction = $this->buatRiwayat($user, 'Berhasil', [
            'ket_usia' => 30,
            'usia' => TrainingData::USIA_PRODUKTIF,
            'kepatuhan_minum_obat' => 'Patuh',
            'riwayat_pengobatan' => 'Kasus Baru',
        ]);

        $this->actingAs($user)
            ->get("/prediction/{$prediction->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rekomendasi.tingkat_risiko', RekomendasiKlinis::RISIKO_RENDAH)
                ->where('rekomendasi.jumlah_faktor_risiko', 0)
            );
    }

    /**
     * Riwayat lama dapat tersimpan tanpa seluruh variabel, sehingga halaman
     * detail tidak boleh galat ketika data pasien tidak lengkap.
     */
    public function test_data_pasien_tidak_lengkap_tidak_menggagalkan_halaman(): void
    {
        $user = User::factory()->create();

        $prediction = Prediction::create([
            'user_id' => $user->id,
            'slug' => 'UJI-kosong',
            'patient_data' => [],
            'prediction_result' => 'Berhasil',
            'model_used' => 'Random Forest',
            'confidence_score' => 80.0,
            'probabilities' => ['Berhasil' => 80.0, 'Tidak Berhasil' => 20.0],
            'feature_importance' => null,
        ]);

        $this->actingAs($user)
            ->get("/prediction/{$prediction->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('rekomendasi.tindakan', 1));
    }
}
