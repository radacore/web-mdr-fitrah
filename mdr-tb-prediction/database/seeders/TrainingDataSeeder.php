<?php

namespace Database\Seeders;

use App\Models\TrainingData;
use Illuminate\Database\Seeder;

/**
 * Mengimpor dataset rekam medis pasien MDR-TB dari RSUD Labuang Baji,
 * Sulawesi Selatan (Bab III.A) ke dalam basis data aplikasi.
 */
class TrainingDataSeeder extends Seeder
{
    public function run(): void
    {
        $csvPath = base_path('../ml-service/data/data_uji_ml.csv');

        if (! file_exists($csvPath)) {
            $this->command->error("Berkas dataset tidak ditemukan: {$csvPath}");

            return;
        }

        $handle = fopen($csvPath, 'r');
        $header = null;
        $jumlah = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if ($header === null) {
                $header = $row;

                continue;
            }

            if (blank($row[0] ?? null)) {
                continue;
            }

            $bb = (float) $row[4];
            $tb = (float) $row[5];
            $ketUsia = (int) $row[1];

            TrainingData::create([
                // Kategori usia dan IMT dihitung ulang agar konsisten dengan
                // perhitungan pada layanan machine learning
                'usia' => TrainingData::kategoriUsia($ketUsia),
                'ket_usia' => $ketUsia,
                'jenis_kelamin' => $row[2],
                'status_bekerja' => $row[3],
                'bb' => $bb,
                'tb' => $tb,
                'imt' => TrainingData::hitungImt($bb, $tb),
                'status_gizi' => $row[7],
                'status_merokok' => $row[8],
                'pemeriksaan_kontak' => $row[9],
                'riwayat_dm' => $row[10],
                'riwayat_hiv' => $row[11],
                'komorbiditas' => $row[12],
                'kepatuhan_minum_obat' => $row[13],
                'efek_samping_obat' => $row[14],
                // Kolom keterangan efek samping berupa teks bebas,
                // tidak digunakan sebagai fitur model
                'keterangan_efek_samping' => $row[15] ?? null,
                'riwayat_pengobatan' => $row[16],
                'panduan_pengobatan' => $row[17],
                'keberhasilan_pengobatan' => $row[18],
            ]);

            $jumlah++;
        }

        fclose($handle);

        $berhasil = TrainingData::where('keberhasilan_pengobatan', 'Berhasil')->count();
        $tidakBerhasil = TrainingData::where('keberhasilan_pengobatan', 'Tidak Berhasil')->count();

        $this->command->info("Berhasil mengimpor {$jumlah} data rekam medis.");
        $this->command->info("Distribusi kelas: Berhasil {$berhasil}, Tidak Berhasil {$tidakBerhasil}.");
    }
}
