<?php

namespace Tests\Feature;

use App\Models\Prediction;
use App\Models\TrainingData;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tanggal awal pengobatan dipakai untuk menurunkan durasi dan status
 * pengobatan. Keduanya merupakan informasi tampilan, bukan variabel model:
 * model tetap memakai 17 variabel penelitian. Tanggal wajib pada klasifikasi
 * baru, tetapi opsional pada data rekam medis lama agar 175 baris tetap dapat
 * disunting.
 */
class TanggalPengobatanTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function dataPasien(array $tambahan = []): array
    {
        return [
            'nama_lengkap' => 'Pasien Uji',
            'ket_usia' => 48,
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
            ...$tambahan,
        ];
    }

    private function palsukanLayananMl(): void
    {
        Http::fake([
            '*/predict' => Http::response([
                'prediction' => 'Berhasil',
                'model_used' => 'Random Forest',
                'confidence' => 0.91,
                'probabilities' => [
                    'Berhasil' => 0.91,
                    'Tidak Berhasil' => 0.09,
                ],
                'feature_importance' => [],
            ]),
        ]);
    }

    public function test_tanggal_awal_pengobatan_wajib_saat_klasifikasi(): void
    {
        $this->palsukanLayananMl();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/prediction', $this->dataPasien())
            ->assertSessionHasErrors('tanggal_awal_pengobatan');

        $this->assertSame(0, Prediction::count());
    }

    public function test_tanggal_awal_pengobatan_di_masa_depan_ditolak(): void
    {
        $this->palsukanLayananMl();

        $besok = Carbon::now(TrainingData::ZONA_WAKTU)->addDay()->toDateString();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/prediction', $this->dataPasien([
                'tanggal_awal_pengobatan' => $besok,
            ]))
            ->assertSessionHasErrors('tanggal_awal_pengobatan');
    }

    public function test_durasi_dan_status_disimpan_sebagai_potret_klasifikasi(): void
    {
        $this->palsukanLayananMl();

        $tanggal = Carbon::now(TrainingData::ZONA_WAKTU)
            ->subMonthsNoOverflow(6)
            ->toDateString();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/prediction', $this->dataPasien([
                'tanggal_awal_pengobatan' => $tanggal,
            ]))
            ->assertSessionHasNoErrors();

        $data = Prediction::latest('id')->first()->patient_data;

        $this->assertSame($tanggal, $data['tanggal_awal_pengobatan']);
        $this->assertSame(TrainingData::STATUS_PENGOBATAN_LAMA, $data['status_pengobatan']);
        $this->assertStringContainsString('bulan', $data['durasi_pengobatan']);
    }

    public function test_tanggal_dan_turunan_tidak_dikirim_ke_layanan_ml(): void
    {
        $this->palsukanLayananMl();

        $tanggal = Carbon::now(TrainingData::ZONA_WAKTU)
            ->subMonthsNoOverflow(2)
            ->toDateString();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/prediction', $this->dataPasien([
                'tanggal_awal_pengobatan' => $tanggal,
            ]))
            ->assertSessionHasNoErrors();

        Http::assertSent(function ($request) {
            $payload = $request->data();

            return $request->url() === config('ml.url').'/predict'
                && count($payload) === 16
                && ! array_key_exists('tanggal_awal_pengobatan', $payload)
                && ! array_key_exists('durasi_pengobatan', $payload)
                && ! array_key_exists('status_pengobatan', $payload);
        });
    }

    public function test_batas_enam_bulan_menentukan_status_pengobatan(): void
    {
        $limaBulan = TrainingData::durasiPengobatan('2026-01-04', '2026-07-03');
        $enamBulan = TrainingData::durasiPengobatan('2026-01-04', '2026-07-04');

        $this->assertSame(5, $limaBulan['bulan']);
        $this->assertSame(29, $limaBulan['hari']);
        $this->assertSame(TrainingData::STATUS_PENGOBATAN_BARU, TrainingData::statusPengobatan($limaBulan['bulan']));
        $this->assertSame(6, $enamBulan['bulan']);
        $this->assertSame(TrainingData::STATUS_PENGOBATAN_LAMA, TrainingData::statusPengobatan($enamBulan['bulan']));
    }

    public function test_perhitungan_bulan_tidak_overflow_pada_akhir_bulan(): void
    {
        // 31 Januari + 1 bulan = 28 Februari, bukan 3 Maret.
        $durasi = TrainingData::durasiPengobatan('2026-01-31', '2026-02-28');

        $this->assertSame(1, $durasi['bulan']);
        $this->assertSame(0, $durasi['hari']);
        $this->assertSame('1 bulan', $durasi['label']);
    }

    public function test_data_rekam_medis_lama_tanpa_tanggal_tetap_valid(): void
    {
        $this->seed(\Database\Seeders\TrainingDataSeeder::class);

        $this->assertSame(175, TrainingData::whereNull('tanggal_awal_pengobatan')->count());

        $data = TrainingData::first();

        $this->actingAs(User::factory()->admin()->create())
            ->put('/training-data/'.$data->id, $this->dataPasien([
                'keberhasilan_pengobatan' => $data->keberhasilan_pengobatan,
            ]))
            ->assertSessionHasNoErrors();

        $this->assertNull($data->fresh()->tanggal_awal_pengobatan);
    }

    public function test_tanggal_pengobatan_opsional_pada_data_rekam_medis(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post('/training-data', $this->dataPasien([
                'tanggal_awal_pengobatan' => '',
                'keberhasilan_pengobatan' => 'Berhasil',
            ]))
            ->assertSessionHasNoErrors();

        $this->assertNull(TrainingData::latest('id')->first()->tanggal_awal_pengobatan);
    }

    public function test_tanggal_pengobatan_di_masa_depan_ditolak_pada_data_rekam_medis(): void
    {
        $besok = Carbon::now(TrainingData::ZONA_WAKTU)->addDay()->toDateString();

        $this->actingAs(User::factory()->admin()->create())
            ->post('/training-data', $this->dataPasien([
                'tanggal_awal_pengobatan' => $besok,
                'keberhasilan_pengobatan' => 'Berhasil',
            ]))
            ->assertSessionHasErrors('tanggal_awal_pengobatan');
    }
}
