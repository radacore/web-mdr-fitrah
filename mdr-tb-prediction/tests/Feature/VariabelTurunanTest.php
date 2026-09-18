<?php

namespace Tests\Feature;

use App\Models\TrainingData;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Kategori usia dan IMT merupakan variabel turunan yang dihitung sistem dari
 * usia, berat, dan tinggi badan. Perhitungan otomatis ini mencegah data tidak
 * konsisten seperti pasien berusia 48 tahun yang tercatat sebagai usia produktif.
 */
class VariabelTurunanTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{int, string}>
     */
    public static function pasanganUsia(): array
    {
        return [
            'usia anak' => [13, TrainingData::USIA_PRODUKTIF],
            'satu tahun sebelum batas' => [44, TrainingData::USIA_PRODUKTIF],
            'tepat pada batas' => [45, TrainingData::USIA_LANJUT],
            'di atas batas' => [48, TrainingData::USIA_LANJUT],
            'usia tua' => [77, TrainingData::USIA_LANJUT],
        ];
    }

    #[DataProvider('pasanganUsia')]
    public function test_kategori_usia_ditentukan_dari_usia_dalam_tahun(
        int $usia,
        string $harapan
    ): void {
        $this->assertSame($harapan, TrainingData::kategoriUsia($usia));
    }

    public function test_imt_dihitung_dari_berat_dan_tinggi_badan(): void
    {
        $this->assertSame(19.1, TrainingData::hitungImt(52, 165));
        $this->assertSame(0.0, TrainingData::hitungImt(52, 0));
    }

    /**
     * @return array<string, mixed>
     */
    private function dataRekamMedis(int $usia): array
    {
        return [
            'ket_usia' => $usia,
            'jenis_kelamin' => 'Laki-Laki',
            'status_bekerja' => 'Bekerja',
            'bb' => 52,
            'tb' => 165,
            'status_gizi' => 'Gizi Normal',
            'status_merokok' => 'Merokok',
            'pemeriksaan_kontak' => 'Ya',
            'riwayat_dm' => 'Tidak',
            'riwayat_hiv' => 'Tidak',
            'komorbiditas' => 'Tidak Ada',
            'kepatuhan_minum_obat' => 'Patuh',
            'efek_samping_obat' => 'Tidak Ada Keluhan',
            'riwayat_pengobatan' => 'Kasus Baru',
            'panduan_pengobatan' => 'Jangka Pendek',
            'keberhasilan_pengobatan' => 'Berhasil',
        ];
    }

    public function test_kategori_usia_dan_imt_diisi_saat_data_disimpan(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post('/training-data', $this->dataRekamMedis(48))
            ->assertSessionHasNoErrors();

        $data = TrainingData::latest('id')->first();

        $this->assertSame(TrainingData::USIA_LANJUT, $data->usia);
        $this->assertSame(19.1, $data->imt);
    }

    public function test_kategori_usia_mengikuti_perubahan_usia_saat_data_diperbarui(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post('/training-data', $this->dataRekamMedis(52));
        $data = TrainingData::latest('id')->first();
        $this->assertSame(TrainingData::USIA_LANJUT, $data->usia);

        $this->actingAs($admin)
            ->put('/training-data/'.$data->id, $this->dataRekamMedis(30))
            ->assertSessionHasNoErrors();

        $this->assertSame(TrainingData::USIA_PRODUKTIF, $data->fresh()->usia);
    }

    /**
     * Kategori usia yang dikirim pengguna diabaikan agar nilainya tidak dapat
     * dibuat bertentangan dengan usia pasien.
     */
    public function test_kategori_usia_kiriman_pengguna_diabaikan(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post('/training-data', [
            ...$this->dataRekamMedis(48),
            'usia' => TrainingData::USIA_PRODUKTIF,
        ]);

        $this->assertSame(
            TrainingData::USIA_LANJUT,
            TrainingData::latest('id')->first()->usia
        );
    }

    public function test_seluruh_data_awal_memiliki_kategori_usia_yang_konsisten(): void
    {
        $this->seed(\Database\Seeders\TrainingDataSeeder::class);

        $tidakKonsisten = TrainingData::all()->filter(
            fn (TrainingData $data) => $data->usia !== TrainingData::kategoriUsia($data->ket_usia)
        );

        $this->assertCount(0, $tidakKonsisten);
        $this->assertSame(175, TrainingData::count());
    }
}
