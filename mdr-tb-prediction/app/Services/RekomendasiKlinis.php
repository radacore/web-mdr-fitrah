<?php

namespace App\Services;

use App\Models\TrainingData;

/**
 * Menyusun rekomendasi tindakan klinis dari hasil klasifikasi dan faktor
 * risiko pasien.
 *
 * Sistem pendukung keputusan pada penelitian ini tidak berhenti pada label
 * klasifikasi, tetapi juga "merekomendasikan tindakan penanganan" agar
 * intervensi medis dapat dilakukan lebih awal (Bab II.A.20).
 *
 * Rekomendasi disusun berbasis aturan (rule based) atas nilai variabel yang
 * dimasukkan tenaga medis, bukan dihasilkan oleh model Random Forest. Model
 * hanya menghasilkan label dan probabilitas; penalaran tindakan tetap
 * mengikuti faktor risiko yang diamati pada dataset penelitian.
 *
 * Aturan dan prioritas berikut diturunkan dari analisis 175 data rekam medis
 * pasien MDR-TB RSUD Labuang Baji. Setiap aturan hanya dipertahankan bila
 * kelompok yang memenuhi kondisi memiliki tingkat kegagalan pengobatan lebih
 * tinggi dibandingkan kelompok pembanding (baseline kegagalan 30,9%).
 * Prioritas ditentukan dari besarnya selisih tingkat kegagalan:
 * selisih ≥ 50 poin persen tergolong prioritas tinggi, sedangkan
 * selisih 5–50 poin persen tergolong prioritas sedang.
 */
class RekomendasiKlinis
{
    public const PRIORITAS_TINGGI = 'Tinggi';

    public const PRIORITAS_SEDANG = 'Sedang';

    public const RISIKO_TINGGI = 'Tinggi';

    public const RISIKO_SEDANG = 'Sedang';

    public const RISIKO_RENDAH = 'Rendah';

    /**
     * Aturan faktor risiko yang didukung dataset 175 baris. Kolom terakhir
     * memuat selisih tingkat kegagalan (dalam poin persen) antara kelompok
     * yang memenuhi kondisi dengan kelompok pembanding, sebagai justifikasi
     * kuantitatif prioritas.
     *
     * @var list<array{variabel: string, nilai: string, faktor: string, prioritas: string, tindakan: string, selisih_persen: float}>
     */
    private const ATURAN = [
        [
            'variabel' => 'kepatuhan_minum_obat',
            'nilai' => 'Tidak Patuh',
            'faktor' => 'Tidak patuh minum obat',
            'prioritas' => self::PRIORITAS_TINGGI,
            'tindakan' => 'Aktifkan pendampingan minum obat (PMO) harian dan lakukan pelacakan pada hari yang sama bila pasien tidak datang mengambil obat, karena ketidakpatuhan merupakan pemicu utama putus berobat.',
            'selisih_persen' => 85.0,
        ],
        [
            'variabel' => 'panduan_pengobatan',
            'nilai' => 'Jangka Panjang',
            'faktor' => 'Regimen jangka panjang',
            'prioritas' => self::PRIORITAS_TINGGI,
            'tindakan' => 'Susun jadwal pemantauan berkala sampai akhir regimen dan siapkan pengingat kunjungan, karena durasi pengobatan yang panjang meningkatkan risiko putus obat.',
            'selisih_persen' => 69.2,
        ],
        [
            'variabel' => 'riwayat_pengobatan',
            'nilai' => 'Kasus Lama',
            'faktor' => 'Riwayat pengobatan ulang',
            'prioritas' => self::PRIORITAS_TINGGI,
            'tindakan' => 'Telusuri penyebab kegagalan atau putus obat pada pengobatan sebelumnya dan pastikan hasil uji kepekaan obat terbaru tersedia sebelum regimen dilanjutkan.',
            'selisih_persen' => 51.7,
        ],
        [
            'variabel' => 'status_merokok',
            'nilai' => 'Merokok',
            'faktor' => 'Masih merokok',
            'prioritas' => self::PRIORITAS_SEDANG,
            'tindakan' => 'Berikan konseling berhenti merokok karena kebiasaan merokok memperburuk fungsi paru dan memperlambat perbaikan klinis.',
            'selisih_persen' => 39.5,
        ],
        [
            'variabel' => 'riwayat_dm',
            'nilai' => 'Ada',
            'faktor' => 'Riwayat diabetes melitus',
            'prioritas' => self::PRIORITAS_SEDANG,
            'tindakan' => 'Kendalikan kadar gula darah bersama layanan penyakit dalam karena diabetes yang tidak terkontrol memperlambat konversi dahak.',
            'selisih_persen' => 26.0,
        ],
        [
            'variabel' => 'komorbiditas',
            'nilai' => 'Ada',
            'faktor' => 'Komorbiditas lain',
            'prioritas' => self::PRIORITAS_SEDANG,
            'tindakan' => 'Koordinasikan penanganan penyakit penyerta dengan poli terkait agar pengobatan MDR-TB tetap berjalan tanpa terputus.',
            'selisih_persen' => 25.6,
        ],
        [
            'variabel' => 'usia',
            'nilai' => TrainingData::USIA_LANJUT,
            'faktor' => 'Usia lanjut',
            'prioritas' => self::PRIORITAS_SEDANG,
            'tindakan' => 'Pantau fungsi ginjal, fungsi hati, dan pendengaran lebih ketat karena kelompok usia ini lebih rentan terhadap toksisitas obat lini kedua.',
            'selisih_persen' => 16.0,
        ],
        [
            'variabel' => 'riwayat_hiv',
            'nilai' => 'Ada',
            'faktor' => 'Riwayat HIV',
            'prioritas' => self::PRIORITAS_SEDANG,
            'tindakan' => 'Pastikan terapi antiretroviral berjalan dan koordinasikan pemantauan bersama layanan HIV melalui kolaborasi TB-HIV. Perhatikan bahwa selisih pada dataset tergolong kecil karena hanya 8 pasien HIV, sehingga aturan ini lebih bersandar pada pedoman program TB-HIV daripada kekuatan bukti data.',
            'selisih_persen' => 7.0,
        ],
    ];

    /**
     * Menyusun rekomendasi untuk satu pasien.
     *
     * @param  array<string, mixed>  $dataPasien  nilai 17 variabel masukan model
     * @return array{tingkat_risiko: string, ringkasan: string, tindakan: list<array{faktor: string, prioritas: string, tindakan: string}>, jumlah_faktor_risiko: int, catatan: string}
     */
    public static function untuk(array $dataPasien, string $hasilKlasifikasi): array
    {
        $berisiko = $hasilKlasifikasi === 'Tidak Berhasil';
        $faktor = self::kumpulkanFaktorRisiko($dataPasien);
        $tingkatRisiko = self::tentukanTingkatRisiko($berisiko, $faktor);

        return [
            'tingkat_risiko' => $tingkatRisiko,
            'ringkasan' => self::susunRingkasan($berisiko, count($faktor)),
            'tindakan' => self::susunTindakan($berisiko, $faktor),
            'jumlah_faktor_risiko' => count($faktor),
            'catatan' => 'Rekomendasi disusun otomatis dari faktor risiko yang terekam pada data pasien, bukan dari keluaran model. Prioritas tindakan diturunkan dari besarnya selisih tingkat kegagalan pada dataset 175 baris.',
        ];
    }

    /**
     * Faktor risiko yang terpenuhi berdasarkan nilai variabel pasien.
     *
     * @param  array<string, mixed>  $dataPasien
     * @return list<array{faktor: string, prioritas: string, tindakan: string}>
     */
    private static function kumpulkanFaktorRisiko(array $dataPasien): array
    {
        $faktor = [];

        foreach (self::ATURAN as $aturan) {
            $nilai = $dataPasien[$aturan['variabel']] ?? null;

            if (is_string($nilai) && $nilai === $aturan['nilai']) {
                $faktor[] = [
                    'faktor' => $aturan['faktor'],
                    'prioritas' => $aturan['prioritas'],
                    'tindakan' => $aturan['tindakan'],
                ];
            }
        }

        return $faktor;
    }

    /**
     * Tingkat risiko menggabungkan hasil klasifikasi model dengan banyaknya
     * faktor risiko yang terekam, sehingga pasien yang diklasifikasikan
     * berhasil namun memikul beberapa faktor risiko tetap mendapat perhatian.
     *
     * @param  list<array{faktor: string, prioritas: string, tindakan: string}>  $faktor
     */
    private static function tentukanTingkatRisiko(bool $berisiko, array $faktor): string
    {
        if ($berisiko) {
            return self::RISIKO_TINGGI;
        }

        $prioritasTinggi = array_filter(
            $faktor,
            fn (array $item) => $item['prioritas'] === self::PRIORITAS_TINGGI
        );

        if (count($prioritasTinggi) > 0 || count($faktor) >= 3) {
            return self::RISIKO_SEDANG;
        }

        return self::RISIKO_RENDAH;
    }

    private static function susunRingkasan(bool $berisiko, int $jumlahFaktor): string
    {
        if ($berisiko) {
            return $jumlahFaktor > 0
                ? "Pasien diklasifikasikan berisiko gagal pengobatan dengan {$jumlahFaktor} faktor risiko yang dapat diintervensi. Utamakan tindakan berprioritas tinggi berikut."
                : 'Pasien diklasifikasikan berisiko gagal pengobatan meskipun tidak ada faktor risiko spesifik yang terekam. Tingkatkan pemantauan rutin dan telusuri faktor lain di luar variabel yang dicatat.';
        }

        return $jumlahFaktor > 0
            ? "Pasien diklasifikasikan berpotensi berhasil, namun masih terdapat {$jumlahFaktor} faktor risiko yang perlu dikendalikan agar keberhasilan tetap terjaga."
            : 'Pasien diklasifikasikan berpotensi berhasil dan tidak ada faktor risiko yang terekam. Pertahankan pengobatan sesuai jadwal.';
    }

    /**
     * @param  list<array{faktor: string, prioritas: string, tindakan: string}>  $faktor
     * @return list<array{faktor: string, prioritas: string, tindakan: string}>
     */
    private static function susunTindakan(bool $berisiko, array $faktor): array
    {
        $tindakan = [];

        if ($berisiko) {
            $tindakan[] = [
                'faktor' => 'Hasil klasifikasi berisiko gagal',
                'prioritas' => self::PRIORITAS_TINGGI,
                'tindakan' => 'Jadwalkan evaluasi klinis lebih awal dan tingkatkan frekuensi kunjungan serta pemeriksaan dahak sesuai ketentuan program penanggulangan tuberkulosis.',
            ];
        }

        // Prioritas tinggi ditampilkan lebih dahulu agar tindakan paling
        // mendesak terbaca terlebih dulu oleh tenaga medis.
        foreach ([self::PRIORITAS_TINGGI, self::PRIORITAS_SEDANG] as $prioritas) {
            foreach ($faktor as $item) {
                if ($item['prioritas'] === $prioritas) {
                    $tindakan[] = $item;
                }
            }
        }

        if ($tindakan === []) {
            $tindakan[] = [
                'faktor' => 'Pemantauan rutin',
                'prioritas' => self::PRIORITAS_SEDANG,
                'tindakan' => 'Lanjutkan regimen sesuai jadwal, pertahankan pendampingan minum obat, dan lakukan pemeriksaan dahak berkala sampai pengobatan selesai.',
            ];
        }

        return $tindakan;
    }
}
