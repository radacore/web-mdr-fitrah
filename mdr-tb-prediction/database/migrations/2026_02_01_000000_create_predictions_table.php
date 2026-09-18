<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menyimpan hasil klasifikasi keberhasilan pengobatan pasien MDR-TB
     * beserta data pasien yang menjadi masukan model.
     */
    public function up(): void
    {
        Schema::create('predictions', function (Blueprint $table) {
            $table->id();

            // Slug dibentuk dari inisial nama pasien agar identitas tidak
            // terekspos pada tautan (etika penelitian, Bab II.A.19)
            $table->string('slug')->unique();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 17 variabel penelitian dalam bentuk JSON
            $table->json('patient_data');

            // Hasil klasifikasi: "Berhasil" atau "Tidak Berhasil"
            $table->string('prediction_result');
            $table->string('model_used');
            $table->float('confidence_score');
            $table->json('probabilities');

            // Feature importance Random Forest saat prediksi dibuat
            $table->json('feature_importance')->nullable();

            $table->timestamps();

            $table->index('prediction_result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('predictions');
    }
};
