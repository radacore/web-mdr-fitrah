<?php

use App\Models\TrainingData;
use App\Services\MlServiceClient;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rute API
|--------------------------------------------------------------------------
|
| Seluruh endpoint memerlukan autentikasi sesi karena mengakses data rekam
| medis dan memicu proses pelatihan model yang mahal secara komputasi.
| Endpoint pelatihan dan skenario pengujian hanya dapat diakses admin.
|
*/

Route::middleware(['web', 'auth', 'admin'])->group(function () {
    /**
     * Pelatihan ulang model Random Forest menggunakan data rekam medis
     * yang tersimpan pada basis data.
     */
    Route::post('/retrain', function (MlServiceClient $ml) {
        $records = TrainingData::all()->toArray();

        if ($records === []) {
            return response()->json([
                'error' => 'Belum ada data rekam medis pada basis data.',
            ], 400);
        }

        try {
            return response()->json($ml->retrain($records, useSmote: true));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    })->name('api.retrain');

    /**
     * Skenario pengujian efektivitas SMOTE (Bab III.C.5).
     */
    Route::post('/compare-smote', function (MlServiceClient $ml) {
        $records = TrainingData::all()->toArray();

        if ($records === []) {
            return response()->json([
                'error' => 'Belum ada data rekam medis pada basis data.',
            ], 400);
        }

        try {
            return response()->json($ml->compareSmote($records));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    })->name('api.compare-smote');

    /**
     * Skenario variasi proporsi pembagian data dan jumlah pohon (Bab III.C.5).
     */
    Route::post('/test-scenarios', function (MlServiceClient $ml) {
        $records = TrainingData::all()->toArray();

        if ($records === []) {
            return response()->json([
                'error' => 'Belum ada data rekam medis pada basis data.',
            ], 400);
        }

        try {
            return response()->json($ml->testScenarios($records));
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    })->name('api.test-scenarios');
});
