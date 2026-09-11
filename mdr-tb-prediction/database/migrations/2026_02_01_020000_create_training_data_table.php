<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_data', function (Blueprint $table) {
            $table->id();
            
            // Data Demografi
            $table->string('usia'); // Usia Produktif / Usia Lanjut
            $table->integer('ket_usia'); // Umur dalam tahun
            $table->string('jenis_kelamin');
            $table->string('status_bekerja');
            
            // Data Fisik
            $table->float('bb'); // Berat Badan (kg)
            $table->float('tb'); // Tinggi Badan (cm)
            $table->float('imt'); // Indeks Massa Tubuh
            $table->string('status_gizi');
            $table->string('status_merokok');
            
            // Riwayat Kesehatan
            $table->string('pemeriksaan_kontak');
            $table->string('riwayat_dm');
            $table->string('riwayat_hiv');
            $table->string('komorbiditas');
            
            // Pengobatan
            $table->string('kepatuhan_minum_obat');
            $table->string('efek_samping_obat');
            $table->text('keterangan_efek_samping')->nullable();
            $table->string('riwayat_pengobatan');
            $table->string('panduan_pengobatan');
            
            // Target - Hasil diagnosa dokter
            $table->string('keberhasilan_pengobatan'); // Berhasil / Tidak Berhasil
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_data');
    }
};
