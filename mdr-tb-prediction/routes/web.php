<?php

use App\Http\Controllers\PredictionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TrainingDataController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Rute Aplikasi
|--------------------------------------------------------------------------
|
| Seluruh fitur sistem hanya dapat diakses setelah autentikasi, karena data
| yang diproses merupakan data rekam medis yang bersifat sensitif dan
| dilindungi Undang-Undang Nomor 27 Tahun 2022 (Bab II.A.19).
|
| Aktor sistem (Gambar 6):
| - Admin        : mengelola akun tenaga medis dan data rekam medis
| - Tenaga medis : menginput data pasien dan melihat hasil klasifikasi
|
*/

Route::redirect('/', '/login');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');

    // Profil akun pengguna
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');

    // Klasifikasi keberhasilan pengobatan
    Route::get('/prediction', [PredictionController::class, 'index'])->name('prediction.index');
    Route::post('/prediction', [PredictionController::class, 'predict'])->name('prediction.predict');
    Route::get('/prediction/history', [PredictionController::class, 'history'])->name('prediction.history');
    Route::get('/prediction/statistics', [PredictionController::class, 'statistics'])->name('prediction.statistics');

    /*
     * Skenario pengujian model (Bab III.C.5) melatih ulang model beberapa kali,
     * sehingga hanya dapat dijalankan admin. Tenaga medis cukup melihat hasil
     * evaluasi model yang sedang digunakan.
     *
     * Rute ini didaftarkan sebelum /prediction/{prediction} agar tidak
     * tertangkap sebagai parameter riwayat klasifikasi.
     */
    Route::middleware('admin')->group(function () {
        Route::get('/prediction/compare-smote', [PredictionController::class, 'compareSmote'])->name('prediction.compare-smote');
        Route::get('/prediction/test-scenarios', [PredictionController::class, 'testScenarios'])->name('prediction.test-scenarios');
    });

    Route::get('/prediction/{prediction}', [PredictionController::class, 'show'])->name('prediction.show');
    Route::delete('/prediction/{prediction}', [PredictionController::class, 'destroy'])->name('prediction.destroy');

    // Fitur khusus admin
    Route::middleware('admin')->group(function () {
        Route::get('/training-data/cleaning', [TrainingDataController::class, 'cleaning'])->name('training-data.cleaning');
        Route::resource('training-data', TrainingDataController::class)
            ->parameters(['training-data' => 'trainingData']);

        Route::resource('users', UserController::class)->except(['show']);
    });
});

require __DIR__.'/auth.php';
