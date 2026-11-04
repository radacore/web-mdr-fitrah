<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class TrainingData extends Model
{
    use HasFactory;

    /**
     * Batas usia yang memisahkan kategori usia produktif dan usia lanjut.
     * Nilai ini harus sama dengan BATAS_USIA_LANJUT pada
     * ml-service/src/preprocessing.py.
     */
    public const BATAS_USIA_LANJUT = 45;

    public const USIA_PRODUKTIF = 'Usia Produktif';

    public const USIA_LANJUT = 'Usia Lanjut';

    /**
     * Batas durasi yang memisahkan pengobatan baru dan pengobatan lama.
     * Pengobatan MDR-TB berlangsung 18-24 bulan; enam bulan dipakai sebagai
     * penanda tahap awal pengobatan telah dilalui.
     */
    public const BATAS_BULAN_PENGOBATAN_LAMA = 6;

    public const STATUS_PENGOBATAN_BARU = 'Pengobatan Baru';

    public const STATUS_PENGOBATAN_LAMA = 'Pengobatan Lama';

    /**
     * Zona waktu acuan untuk menghitung "hari ini". Penyimpanan waktu tetap
     * memakai zona waktu aplikasi (UTC), sedangkan tanggal pengobatan diisi
     * menurut waktu lokal layanan kesehatan.
     */
    public const ZONA_WAKTU = 'Asia/Makassar';

    /**
     * Nilai kategorikal yang diperbolehkan untuk setiap variabel.
     *
     * Sumber kebenaran tunggal antara aturan validasi (TrainingDataController,
     * PredictionController) dan opsi pada formulir (resources/js/lib/variabel.ts).
     * Nilai berikut sesuai dengan pemetaan pada
     * ml-service/src/preprocessing.py::LABEL_ENCODINGS dan istilah pada data
     * rekam medis asli dari RSUD Labuang Baji.
     *
     * @var array<string, list<string>>
     */
    public const OPSI_KATEGORIK = [
        'jenis_kelamin' => ['Laki-Laki', 'Perempuan'],
        'status_bekerja' => ['Bekerja', 'Tidak Bekerja'],
        'status_gizi' => ['Gizi Kurang', 'Gizi Normal', 'Gizi Lebih'],
        'status_merokok' => ['Merokok', 'Tidak Merokok'],
        'pemeriksaan_kontak' => ['Ya', 'Tidak'],
        'riwayat_dm' => ['Ada', 'Tidak'],
        'riwayat_hiv' => ['Ada', 'Tidak'],
        'komorbiditas' => ['Ada', 'Tidak Ada'],
        'kepatuhan_minum_obat' => ['Patuh', 'Tidak Patuh'],
        'efek_samping_obat' => ['Ada Keluhan', 'Tidak Ada Keluhan'],
        'riwayat_pengobatan' => ['Kasus Baru', 'Kasus Lama'],
        'panduan_pengobatan' => ['Jangka Pendek', 'Jangka Panjang'],
        'keberhasilan_pengobatan' => ['Berhasil', 'Tidak Berhasil'],
    ];

    protected $table = 'training_data';

    protected $fillable = [
        'usia',
        'ket_usia',
        'jenis_kelamin',
        'status_bekerja',
        'bb',
        'tb',
        'imt',
        'status_gizi',
        'status_merokok',
        'pemeriksaan_kontak',
        'riwayat_dm',
        'riwayat_hiv',
        'komorbiditas',
        'kepatuhan_minum_obat',
        'efek_samping_obat',
        'keterangan_efek_samping',
        'riwayat_pengobatan',
        'panduan_pengobatan',
        'tanggal_awal_pengobatan',
        'keberhasilan_pengobatan',
    ];

    protected $casts = [
        'ket_usia' => 'integer',
        'bb' => 'float',
        'tb' => 'float',
        'imt' => 'float',
        'tanggal_awal_pengobatan' => 'date',
    ];

    /**
     * Kategori usia merupakan variabel turunan dari usia dalam tahun, sehingga
     * nilainya dihitung dan tidak diisi manual. Penurunan otomatis ini mencegah
     * ketidaksesuaian antara usia dan kategorinya.
     */
    public static function kategoriUsia(int|float $usiaTahun): string
    {
        return $usiaTahun >= self::BATAS_USIA_LANJUT
            ? self::USIA_LANJUT
            : self::USIA_PRODUKTIF;
    }

    /**
     * IMT dihitung dari berat dan tinggi badan dengan rumus yang sama seperti
     * pada layanan machine learning: IMT = BB / (TB dalam meter)^2.
     */
    public static function hitungImt(int|float $bb, int|float $tb): float
    {
        if ($tb <= 0) {
            return 0.0;
        }

        return round($bb / (($tb / 100) ** 2), 2);
    }

    /**
     * Tanggal hari ini menurut zona waktu layanan kesehatan, dipakai sebagai
     * batas atas tanggal awal pengobatan pada validasi.
     */
    public static function hariIni(): string
    {
        return now(self::ZONA_WAKTU)->toDateString();
    }

    /**
     * Durasi pengobatan dihitung dari tanggal awal sampai hari ini.
     *
     * Nilai ini merupakan variabel turunan tampilan, bukan masukan model:
     * model tetap memakai 17 variabel penelitian. Perhitungan yang sama
     * dilakukan di front-end (resources/js/lib/variabel.ts) untuk pratinjau
     * langsung pada formulir.
     *
     * @return array{bulan: int, hari: int, label: string}
     */
    public static function durasiPengobatan(?string $tanggal, ?string $sampai = null): array
    {
        if (blank($tanggal)) {
            return ['bulan' => 0, 'hari' => 0, 'label' => '-'];
        }

        $mulai = Carbon::parse($tanggal, self::ZONA_WAKTU)->startOfDay();
        $akhir = Carbon::parse($sampai ?? self::hariIni(), self::ZONA_WAKTU)->startOfDay();

        if ($mulai->greaterThan($akhir)) {
            return ['bulan' => 0, 'hari' => 0, 'label' => '-'];
        }

        // Hitungan bulan mengikuti penambahan bulan kalender tanpa overflow
        // (31 Januari + 1 bulan = 28/29 Februari), sama seperti perhitungan
        // pratinjau di front-end.
        $bulan = 0;
        $kursor = $mulai->copy();

        while ($kursor->copy()->addMonthNoOverflow()->lessThanOrEqualTo($akhir)) {
            $kursor->addMonthNoOverflow();
            $bulan++;
        }

        $hari = (int) $kursor->diffInDays($akhir);

        return [
            'bulan' => $bulan,
            'hari' => $hari,
            'label' => self::formatDurasi($bulan, $hari),
        ];
    }

    /**
     * Status pengobatan diturunkan dari durasi, bukan diisi manual, agar
     * tidak bertentangan dengan tanggal awal pengobatan.
     */
    public static function statusPengobatan(int $bulan): string
    {
        return $bulan >= self::BATAS_BULAN_PENGOBATAN_LAMA
            ? self::STATUS_PENGOBATAN_LAMA
            : self::STATUS_PENGOBATAN_BARU;
    }

    /**
     * Ringkasan pengobatan yang disimpan bersama hasil klasifikasi, sehingga
     * riwayat tetap menampilkan kondisi saat klasifikasi dilakukan.
     *
     * @return array{tanggal_awal_pengobatan: string|null, durasi_pengobatan: string, status_pengobatan: string}
     */
    public static function ringkasanPengobatan(?string $tanggal): array
    {
        $durasi = self::durasiPengobatan($tanggal);

        return [
            'tanggal_awal_pengobatan' => $tanggal,
            'durasi_pengobatan' => $durasi['label'],
            'status_pengobatan' => $tanggal
                ? self::statusPengobatan($durasi['bulan'])
                : '-',
        ];
    }

    private static function formatDurasi(int $bulan, int $hari): string
    {
        $bagian = [];

        if ($bulan > 0) {
            $bagian[] = $bulan.' bulan';
        }

        if ($hari > 0) {
            $bagian[] = $hari.' hari';
        }

        return $bagian === [] ? '0 hari' : implode(' ', $bagian);
    }

    /**
     * Aturan validasi Laravel untuk variabel kategorikal, dalam bentuk
     * "in:nilai1,nilai2,...", agar nilai di luar daftar OPSI_KATEGORIK
     * ditolak dan basis data tidak terkontaminasi istilah baru.
     */
    public static function aturanKategorik(string $variabel): string
    {
        return 'in:'.implode(',', self::OPSI_KATEGORIK[$variabel] ?? []);
    }
}
