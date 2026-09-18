<?php

namespace Tests\Unit;

use App\Models\TrainingData;
use App\Services\RekomendasiKlinis;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Sistem pendukung keputusan tidak berhenti pada label klasifikasi, tetapi juga
 * merekomendasikan tindakan penanganan agar intervensi medis dapat dilakukan
 * lebih awal (Bab II.A.20).
 */
class RekomendasiKlinisTest extends TestCase
{
    /**
     * Pasien tanpa faktor risiko sama sekali.
     *
     * @return array<string, string|int>
     */
    private function pasienIdeal(): array
    {
        return [
            'ket_usia' => 30,
            'usia' => TrainingData::USIA_PRODUKTIF,
            'jenis_kelamin' => 'Laki-Laki',
            'status_bekerja' => 'Bekerja',
            'bb' => 60,
            'tb' => 170,
            'status_gizi' => 'Gizi Normal',
            'status_merokok' => 'Tidak Merokok',
            'pemeriksaan_kontak' => 'Ya',
            'riwayat_dm' => 'Tidak',
            'riwayat_hiv' => 'Tidak',
            'komorbiditas' => 'Tidak Ada',
            'kepatuhan_minum_obat' => 'Patuh',
            'efek_samping_obat' => 'Tidak Ada Keluhan',
            'riwayat_pengobatan' => 'Kasus Baru',
            'panduan_pengobatan' => 'Jangka Pendek',
        ];
    }

    public function test_pasien_berhasil_tanpa_faktor_risiko_berisiko_rendah(): void
    {
        $hasil = RekomendasiKlinis::untuk($this->pasienIdeal(), 'Berhasil');

        $this->assertSame(RekomendasiKlinis::RISIKO_RENDAH, $hasil['tingkat_risiko']);
        $this->assertSame(0, $hasil['jumlah_faktor_risiko']);
    }

    public function test_selalu_ada_minimal_satu_tindakan_yang_dianjurkan(): void
    {
        $hasil = RekomendasiKlinis::untuk($this->pasienIdeal(), 'Berhasil');

        $this->assertNotEmpty($hasil['tindakan']);
        $this->assertSame('Pemantauan rutin', $hasil['tindakan'][0]['faktor']);
    }

    public function test_hasil_tidak_berhasil_selalu_berisiko_tinggi(): void
    {
        $hasil = RekomendasiKlinis::untuk($this->pasienIdeal(), 'Tidak Berhasil');

        $this->assertSame(RekomendasiKlinis::RISIKO_TINGGI, $hasil['tingkat_risiko']);
    }

    /**
     * Tindakan atas hasil klasifikasi berisiko harus muncul paling awal agar
     * tenaga medis membaca anjuran evaluasi dini lebih dahulu.
     */
    public function test_tindakan_atas_hasil_berisiko_ditempatkan_paling_awal(): void
    {
        $data = $this->pasienIdeal();
        $data['status_merokok'] = 'Merokok';

        $hasil = RekomendasiKlinis::untuk($data, 'Tidak Berhasil');

        $this->assertSame(
            'Hasil klasifikasi berisiko gagal',
            $hasil['tindakan'][0]['faktor']
        );
    }

    /**
     * @return array<string, array{string, string, string, string}>
     */
    public static function faktorRisiko(): array
    {
        return [
            'tidak patuh' => [
                'kepatuhan_minum_obat', 'Tidak Patuh',
                'Tidak patuh minum obat', RekomendasiKlinis::PRIORITAS_TINGGI,
            ],
            'regimen jangka panjang' => [
                'panduan_pengobatan', 'Jangka Panjang',
                'Regimen jangka panjang', RekomendasiKlinis::PRIORITAS_TINGGI,
            ],
            'pengobatan ulang' => [
                'riwayat_pengobatan', 'Kasus Lama',
                'Riwayat pengobatan ulang', RekomendasiKlinis::PRIORITAS_TINGGI,
            ],
            'merokok' => [
                'status_merokok', 'Merokok',
                'Masih merokok', RekomendasiKlinis::PRIORITAS_SEDANG,
            ],
            'riwayat diabetes' => [
                'riwayat_dm', 'Ada',
                'Riwayat diabetes melitus', RekomendasiKlinis::PRIORITAS_SEDANG,
            ],
            'komorbiditas' => [
                'komorbiditas', 'Ada',
                'Komorbiditas lain', RekomendasiKlinis::PRIORITAS_SEDANG,
            ],
            'usia lanjut' => [
                'usia', TrainingData::USIA_LANJUT,
                'Usia lanjut', RekomendasiKlinis::PRIORITAS_SEDANG,
            ],
            'riwayat hiv' => [
                'riwayat_hiv', 'Ada',
                'Riwayat HIV', RekomendasiKlinis::PRIORITAS_SEDANG,
            ],
        ];
    }

    #[DataProvider('faktorRisiko')]
    public function test_faktor_risiko_memunculkan_tindakan_yang_sesuai(
        string $variabel,
        string $nilai,
        string $faktorHarapan,
        string $prioritasHarapan
    ): void {
        $data = $this->pasienIdeal();
        $data[$variabel] = $nilai;

        $hasil = RekomendasiKlinis::untuk($data, 'Berhasil');
        $faktorTerdeteksi = array_column($hasil['tindakan'], 'faktor');

        $this->assertContains($faktorHarapan, $faktorTerdeteksi);
        $this->assertSame(1, $hasil['jumlah_faktor_risiko']);

        $prioritas = array_column($hasil['tindakan'], 'prioritas', 'faktor');

        $this->assertSame($prioritasHarapan, $prioritas[$faktorHarapan]);
    }

    /**
     * Pasien yang diklasifikasikan berhasil namun memikul faktor risiko
     * berprioritas tinggi tetap harus diberi perhatian.
     */
    public function test_faktor_prioritas_tinggi_menaikkan_risiko_pasien_berhasil(): void
    {
        $data = $this->pasienIdeal();
        $data['kepatuhan_minum_obat'] = 'Tidak Patuh';

        $hasil = RekomendasiKlinis::untuk($data, 'Berhasil');

        $this->assertSame(RekomendasiKlinis::RISIKO_SEDANG, $hasil['tingkat_risiko']);
    }

    /**
     * Tiga faktor berprioritas sedang secara akumulatif juga menaikkan
     * tingkat risiko meskipun tidak ada faktor berprioritas tinggi.
     */
    public function test_akumulasi_faktor_sedang_menaikkan_tingkat_risiko(): void
    {
        $data = $this->pasienIdeal();
        $data['status_merokok'] = 'Merokok';
        $data['komorbiditas'] = 'Ada';
        $data['riwayat_dm'] = 'Ada';

        $hasil = RekomendasiKlinis::untuk($data, 'Berhasil');

        $this->assertSame(3, $hasil['jumlah_faktor_risiko']);
        $this->assertSame(RekomendasiKlinis::RISIKO_SEDANG, $hasil['tingkat_risiko']);
    }

    /**
     * Dua faktor berprioritas sedang belum cukup untuk menaikkan tingkat
     * risiko, sehingga ambang akumulasi benar-benar diuji.
     */
    public function test_dua_faktor_sedang_masih_berisiko_rendah(): void
    {
        $data = $this->pasienIdeal();
        $data['status_merokok'] = 'Merokok';
        $data['komorbiditas'] = 'Ada';

        $hasil = RekomendasiKlinis::untuk($data, 'Berhasil');

        $this->assertSame(2, $hasil['jumlah_faktor_risiko']);
        $this->assertSame(RekomendasiKlinis::RISIKO_RENDAH, $hasil['tingkat_risiko']);
    }

    public function test_tindakan_prioritas_tinggi_diurutkan_sebelum_sedang(): void
    {
        $data = $this->pasienIdeal();
        $data['status_merokok'] = 'Merokok';
        $data['kepatuhan_minum_obat'] = 'Tidak Patuh';

        $hasil = RekomendasiKlinis::untuk($data, 'Berhasil');
        $prioritas = array_column($hasil['tindakan'], 'prioritas');

        $this->assertSame(
            [RekomendasiKlinis::PRIORITAS_TINGGI, RekomendasiKlinis::PRIORITAS_SEDANG],
            $prioritas
        );
    }

    /**
     * Data pasien yang tidak lengkap tidak boleh menyebabkan galat, karena
     * riwayat lama dapat tersimpan tanpa seluruh variabel.
     */
    public function test_data_pasien_kosong_tidak_menyebabkan_galat(): void
    {
        $hasil = RekomendasiKlinis::untuk([], 'Berhasil');

        $this->assertSame(0, $hasil['jumlah_faktor_risiko']);
        $this->assertNotEmpty($hasil['tindakan']);
        $this->assertNotEmpty($hasil['catatan']);
    }

    public function test_ringkasan_menyebutkan_jumlah_faktor_risiko(): void
    {
        $data = $this->pasienIdeal();
        $data['status_merokok'] = 'Merokok';

        $hasil = RekomendasiKlinis::untuk($data, 'Tidak Berhasil');

        $this->assertStringContainsString('1 faktor risiko', $hasil['ringkasan']);
    }
}
