<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrainingData;

class TrainingDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Path ke file CSV
        $csvPath = base_path('../ml-service/data/data_uji_ml.csv');
        
        if (!file_exists($csvPath)) {
            $this->command->error("CSV file not found: {$csvPath}");
            return;
        }

        $handle = fopen($csvPath, 'r');
        $header = null;
        $count = 0;

        while (($row = fgetcsv($handle)) !== false) {
            // Skip header
            if ($header === null) {
                $header = $row;
                continue;
            }

            // Skip empty rows
            if (empty($row[0])) {
                continue;
            }

            // Map CSV columns to database fields
            TrainingData::create([
                'usia' => $row[0], // Usia
                'ket_usia' => (int) $row[1], // Ket.Usia
                'jenis_kelamin' => $row[2], // Jenis Kelamin
                'status_bekerja' => $row[3], // Status Bekerja
                'bb' => (float) $row[4], // BB
                'tb' => (float) $row[5], // TB
                'imt' => (float) $row[6], // IMT
                'status_gizi' => $row[7], // Status Gizi
                'status_merokok' => $row[8], // Status Merokok
                'pemeriksaan_kontak' => $row[9], // Pemeriksaan Kontak
                'riwayat_dm' => $row[10], // Riwayat_DM
                'riwayat_hiv' => $row[11], // Riwayat_HIV
                'komorbiditas' => $row[12], // Komorbiditas
                'kepatuhan_minum_obat' => $row[13], // Kepatuhan Minum Obat
                'efek_samping_obat' => $row[14], // Efek Samping Obat
                'keterangan_efek_samping' => $row[15] ?? null, // Efek_Samping_Obat (detail)
                'riwayat_pengobatan' => $row[16], // Riwayat Pengobatan Sebelumnya
                'panduan_pengobatan' => $row[17], // Panduan Pengobatan
                'keberhasilan_pengobatan' => $row[18], // Keberhasilan Pengobatan
            ]);

            $count++;
        }

        fclose($handle);
        $this->command->info("Imported {$count} training data records.");
    }
}
