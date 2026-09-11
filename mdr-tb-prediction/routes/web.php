<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PredictionController;
use App\Http\Controllers\TrainingDataController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Landing', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
    ]);
});

Route::get('/lakukan-prediksi', function () {
    return Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
    'laravelVersion' => Application::VERSION,
    'phpVersion' => PHP_VERSION,
    ]);
})->name('lakukan-prediksi');

Route::get('/hasil/{slug}', function (string $slug) {
    $prediction = \App\Models\Prediction::where('slug', $slug)->firstOrFail();
    return Inertia::render('GuestResult', [
    'prediction' => $prediction,
    ]);
})->name('hasil.show');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class , 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class , 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class , 'destroy'])->name('profile.destroy');

    // Prediction Routes
    Route::get('/prediction', [PredictionController::class , 'index'])->name('prediction.index');
    Route::post('/prediction', [PredictionController::class , 'predict'])->name('prediction.predict');
    Route::get('/prediction/history', [PredictionController::class , 'history'])->name('prediction.history');
    Route::get('/prediction/statistics', [PredictionController::class , 'statistics'])->name('prediction.statistics');
    Route::get('/prediction/compare-smote', [PredictionController::class , 'compareSmote'])->name('prediction.compare-smote');
    Route::delete('/prediction/{prediction}', [PredictionController::class , 'destroy'])->name('prediction.destroy');
    Route::get('/prediction/{prediction}', [PredictionController::class , 'show'])->name('prediction.show');

    // Training Data Routes
    Route::get('/training-data/cleaning', [TrainingDataController::class, 'cleaning'])
        ->name('training-data.cleaning');
    Route::get('/training-data/feature-selection', [TrainingDataController::class, 'featureSelection'])
        ->name('training-data.feature-selection');
    Route::resource('training-data', TrainingDataController::class)->parameters([
        'training-data' => 'trainingData'
    ]);

    // System Settings Route
    Route::get('/settings', function () {
            return inertia('Settings/Index');
        }
        )->name('settings.index');
    });

require __DIR__ . '/auth.php';
