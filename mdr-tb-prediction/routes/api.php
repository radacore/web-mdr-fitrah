<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Prediction;
use App\Models\TrainingData;

/*
 |--------------------------------------------------------------------------
 | API Routes
 |--------------------------------------------------------------------------
 */

Route::post('/predict', function (Request $request) {
    $mlServiceUrl = env('ML_SERVICE_URL', 'http://localhost:5000');

    try {
        $inputData = [
            'Usia' => $request->usia,
            'Ket.Usia' => $request->ket_usia,
            'Jenis Kelamin' => $request->jenis_kelamin,
            'Status Bekerja' => $request->status_bekerja,
            'BB' => $request->bb,
            'TB' => $request->tb,
            'Status Gizi' => $request->status_gizi,
            'Status Merokok' => $request->status_merokok,
            'Pemeriksaan Kontak' => $request->pemeriksaan_kontak,
            'Riwayat_DM' => $request->riwayat_dm,
            'Riwayat_HIV' => $request->riwayat_hiv,
            'Komorbiditas' => $request->komorbiditas,
            'Kepatuhan Minum Obat' => $request->kepatuhan_minum_obat,
            'Efek Samping Obat' => $request->efek_samping_obat,
            'Riwayat Pengobatan Sebelumnya' => $request->riwayat_pengobatan,
            'Panduan Pengobatan' => $request->panduan_pengobatan,
        ];

        if (!empty($request->model_name) && $request->model_name !== 'auto') {
            $inputData['model_name'] = $request->model_name;
        }

        $response = Http::timeout(30)->post("{$mlServiceUrl}/predict", $inputData);

        if ($response->successful()) {
            $result = $response->json();

            // Coba simpan ke database, tapi jangan halangi response jika gagal
            try {
                // Store with form-field keys (lowercase) for frontend compatibility
                $patientData = [
                    'nama_lengkap' => $request->nama_lengkap ?? '',
                    'usia' => $request->usia,
                    'ket_usia' => $request->ket_usia,
                    'jenis_kelamin' => $request->jenis_kelamin,
                    'status_bekerja' => $request->status_bekerja,
                    'bb' => $request->bb,
                    'tb' => $request->tb,
                    'status_gizi' => $request->status_gizi,
                    'status_merokok' => $request->status_merokok,
                    'pemeriksaan_kontak' => $request->pemeriksaan_kontak,
                    'riwayat_dm' => $request->riwayat_dm,
                    'riwayat_hiv' => $request->riwayat_hiv,
                    'komorbiditas' => $request->komorbiditas,
                    'kepatuhan_minum_obat' => $request->kepatuhan_minum_obat,
                    'efek_samping_obat' => $request->efek_samping_obat,
                    'riwayat_pengobatan' => $request->riwayat_pengobatan,
                    'panduan_pengobatan' => $request->panduan_pengobatan,
                ];

                // Auto-generate slug from initials of nama_lengkap
                $namaLengkap = $request->nama_lengkap ?? 'Pasien';
                $words = explode(' ', trim($namaLengkap));
                $initials = '';
                foreach ($words as $word) {
                    if (!empty($word)) {
                        $initials .= strtoupper(mb_substr($word, 0, 1));
                    }
                }
                if (empty($initials)) $initials = 'P';
                $slugUnique = $initials . '-' . \Illuminate\Support\Str::random(6);

                $prediction = Prediction::create([
                    'user_id' => auth()->id(), // null jika tidak login
                    'slug' => $slugUnique,
                    'patient_data' => $patientData,
                    'prediction_result' => $result['prediction'] ?? 'Unknown',
                    'model_used' => $result['model_used'] ?? 'Unknown',
                    'confidence_score' => $result['confidence'] ?? 0,
                    'probabilities' => $result['probabilities'] ?? [],
                ]);
                $result['slug'] = $prediction->slug;
            }
            catch (\Exception $dbError) {
                Log::warning('Failed to save prediction to database: ' . $dbError->getMessage());
            }

            return response()->json($result);
        }

        return response()->json([
        'error' => 'ML Service error',
        'message' => $response->body()
        ], $response->status());

    }
    catch (\Exception $e) {
        Log::error('Prediction error: ' . $e->getMessage());
        return response()->json([
        'error' => 'Failed to connect to ML Service',
        'message' => $e->getMessage()
        ], 500);
    }
});

// API endpoint untuk ML Service mengambil training data
Route::get('/training-data', function () {
    $data = TrainingData::all()->map(function ($item) {
            return [
            'Usia' => $item->usia,
            'Ket.Usia' => $item->ket_usia,
            'Jenis Kelamin' => $item->jenis_kelamin,
            'Status Bekerja' => $item->status_bekerja,
            'BB' => $item->bb,
            'TB' => $item->tb,
            'IMT' => $item->imt,
            'Status Gizi' => $item->status_gizi,
            'Status Merokok' => $item->status_merokok,
            'Pemeriksaan Kontak' => $item->pemeriksaan_kontak,
            'Riwayat_DM' => $item->riwayat_dm,
            'Riwayat_HIV' => $item->riwayat_hiv,
            'Komorbiditas' => $item->komorbiditas,
            'Kepatuhan Minum Obat' => $item->kepatuhan_minum_obat,
            'Efek Samping Obat' => $item->efek_samping_obat,
            'Riwayat Pengobatan Sebelumnya' => $item->riwayat_pengobatan,
            'Panduan Pengobatan' => $item->panduan_pengobatan,
            'Keberhasilan Pengobatan' => $item->keberhasilan_pengobatan,
            ];
        }
        );

        return response()->json([
        'data' => $data,
        'count' => $data->count(),
        ]);
    });

// API endpoint untuk retrain model
Route::post('/retrain', function (Request $request) {
    $mlServiceUrl = env('ML_SERVICE_URL', 'http://localhost:5000');

    try {
        // Get all training data from database
        $trainingData = \App\Models\TrainingData::all()->toArray();

        if (empty($trainingData)) {
            return response()->json([
            'error' => 'No training data available in database'
            ], 400);
        }

        // Check if SMOTE requested from frontend
        $useSmote = $request->input('use_smote', false);

        // Send training data directly to ML service
        $response = Http::timeout(120)->post("{$mlServiceUrl}/retrain", [
            'data' => $trainingData,
            'use_smote' => $useSmote,
        ]);

        if ($response->successful()) {
            return response()->json($response->json());
        }

        return response()->json([
        'error' => 'ML Service error',
        'message' => $response->body()
        ], $response->status());

    }
    catch (\Exception $e) {
        Log::error('Retrain error: ' . $e->getMessage());
        return response()->json([
        'error' => 'Failed to connect to ML Service',
        'message' => $e->getMessage()
        ], 500);
    }
});

// API endpoint untuk Active Models configuration
use App\Http\Controllers\ActiveModelController;

Route::get('/active-models', [ActiveModelController::class , 'index']);
Route::post('/active-models', [ActiveModelController::class , 'update']);

// API endpoint untuk komparasi SMOTE vs Non-SMOTE
Route::post('/compare-smote', function (Request $request) {
    $mlServiceUrl = env('ML_SERVICE_URL', 'http://localhost:5000');

    try {
        $trainingData = \App\Models\TrainingData::all()->toArray();

        if (empty($trainingData)) {
            return response()->json([
                'error' => 'No training data available in database'
            ], 400);
        }

        // Timeout 240s karena training 2 skenario + GridSearchCV
        $response = Http::timeout(240)->post("{$mlServiceUrl}/compare-smote", [
            'data' => $trainingData,
        ]);

        if ($response->successful()) {
            return response()->json($response->json());
        }

        return response()->json([
            'error' => 'ML Service error',
            'message' => $response->body()
        ], $response->status());
    } catch (\Exception $e) {
        Log::error('Compare-SMOTE error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Failed to connect to ML Service',
            'message' => $e->getMessage()
        ], 500);
    }
});
