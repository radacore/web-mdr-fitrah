<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'keberhasilan_pengobatan',
    ];

    protected $casts = [
        'ket_usia' => 'integer',
        'bb' => 'float',
        'tb' => 'float',
        'imt' => 'float',
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
     * Aturan validasi Laravel untuk variabel kategorikal, dalam bentuk
     * "in:nilai1,nilai2,...", agar nilai di luar daftar OPSI_KATEGORIK
     * ditolak dan basis data tidak terkontaminasi istilah baru.
     */
    public static function aturanKategorik(string $variabel): string
    {
        return 'in:'.implode(',', self::OPSI_KATEGORIK[$variabel] ?? []);
    }
}
