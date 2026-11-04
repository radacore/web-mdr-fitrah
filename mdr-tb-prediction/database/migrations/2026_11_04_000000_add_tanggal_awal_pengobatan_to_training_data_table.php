<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tanggal awal pengobatan dipakai untuk menurunkan durasi dan status
     * pengobatan pada antarmuka. Kolom ini bukan variabel model, sehingga
     * dibuat nullable agar 175 data rekam medis lama tetap valid.
     */
    public function up(): void
    {
        Schema::table('training_data', function (Blueprint $table) {
            $table->date('tanggal_awal_pengobatan')
                ->nullable()
                ->after('panduan_pengobatan');
        });
    }

    public function down(): void
    {
        Schema::table('training_data', function (Blueprint $table) {
            $table->dropColumn('tanggal_awal_pengobatan');
        });
    }
};
