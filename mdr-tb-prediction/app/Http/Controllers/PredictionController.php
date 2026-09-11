<?php

namespace App\Http\Controllers;

use App\Models\Prediction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class PredictionController extends Controller
{
    /**
     * URL ML Service
     */
    protected string $mlServiceUrl;

    public function __construct()
    {
        $this->mlServiceUrl = env('ML_SERVICE_URL', 'http://localhost:5000');
    }

    /**
     * Tampilkan halaman form prediksi
     */
    public function index()
    {
        try {
            // Ambil info fitur dari ML service
            $response = Http::get("{$this->mlServiceUrl}/features");
            $features = $response->successful() ? $response->json() : null;
        }
        catch (\Exception $e) {
            $features = null;
        }

        return Inertia::render('Prediction/Index', [
            'features' => $features,
            'mlServiceStatus' => $features !== null ? 'connected' : 'disconnected',
        ]);
    }

    /**
     * Proses prediksi
     */
    public function predict(Request $request)
    {
        $validated = $request->validate([
            'nama_lengkap' => 'nullable|string',
            'usia' => 'required|string',
            'ket_usia' => 'required|numeric',
            'jenis_kelamin' => 'required|numeric',
            'status_bekerja' => 'required|numeric',
            'bb' => 'required|numeric',
            'tb' => 'required|numeric',
            'imt' => 'required|numeric',
            'status_gizi' => 'required|numeric',
            'status_merokok' => 'required|numeric',
            'pemeriksaan_kontak' => 'required|numeric',
            'riwayat_dm' => 'required|numeric',
            'riwayat_hiv' => 'required|numeric',
            'komorbiditas' => 'required|numeric',
            'kepatuhan_minum_obat' => 'required|numeric',
            'efek_samping_obat' => 'required|numeric',
            'keterangan_efek_samping' => 'nullable|string',
            'riwayat_pengobatan' => 'required|numeric',
            'panduan_pengobatan' => 'required|numeric',
            'model_name' => 'nullable|string',
        ]);

        // Mapping ke format yang diharapkan ML service
        $mlInput = [
            'Usia' => $validated['usia'],
            'Ket.Usia' => (int)$validated['ket_usia'],
            'Jenis Kelamin' => $validated['jenis_kelamin'],
            'Status Bekerja' => $validated['status_bekerja'],
            'BB' => (float)$validated['bb'],
            'TB' => (float)$validated['tb'],
            'IMT' => (float)$validated['imt'],
            'Status Gizi' => $validated['status_gizi'],
            'Status Merokok' => $validated['status_merokok'],
            'Pemeriksaan Kontak' => $validated['pemeriksaan_kontak'],
            'Riwayat_DM' => $validated['riwayat_dm'],
            'Riwayat_HIV' => $validated['riwayat_hiv'],
            'Komorbiditas' => $validated['komorbiditas'],
            'Kepatuhan Minum Obat' => $validated['kepatuhan_minum_obat'],
            'Efek Samping Obat' => $validated['efek_samping_obat'],
            'Riwayat Pengobatan Sebelumnya' => $validated['riwayat_pengobatan'],
            'Panduan Pengobatan' => $validated['panduan_pengobatan'],
        ];

        if (!empty($validated['model_name']) && $validated['model_name'] !== 'auto') {
            $mlInput['model_name'] = $validated['model_name'];
        }

        try {
            $response = Http::post("{$this->mlServiceUrl}/predict", $mlInput);

            if ($response->successful()) {
                $result = $response->json();

                // Generate slug dari inisial nama lengkap
                $namaLengkap = $validated['nama_lengkap'] ?? 'Pasien';
                $words = explode(' ', trim($namaLengkap));
                $initials = '';
                foreach ($words as $word) {
                    if (!empty($word)) {
                        $initials .= strtoupper(mb_substr($word, 0, 1));
                    }
                }
                if (empty($initials)) $initials = 'P';
                $slug = $initials . '-' . \Illuminate\Support\Str::random(6);

                // Simpan ke database
                $prediction = Prediction::create([
                    'user_id' => auth()->id(),
                    'slug' => $slug,
                    'patient_data' => array_merge($validated, ['nama_lengkap' => $namaLengkap]),
                    'prediction_result' => $result['prediction'],
                    'model_used' => $result['model_used'],
                    'confidence_score' => $result['confidence'],
                    'probabilities' => $result['probabilities'] ?? null,
                    'factor_contributions' => $result['factor_contributions'] ?? null,
                ]);

                return Inertia::render('Prediction/Result', [
                    'prediction' => $prediction,
                    'result' => $result,
                    'input' => $validated,
                ]);
            }
            else {
                return back()->withErrors(['error' => 'ML Service error: ' . $response->body()]);
            }
        }
        catch (\Exception $e) {
            return back()->withErrors(['error' => 'Tidak dapat terhubung ke ML Service: ' . $e->getMessage()]);
        }
    }

    /**
     * Tampilkan riwayat prediksi (semua prediksi termasuk dari guest)
     */
    public function history()
    {
        $predictions = Prediction::orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Prediction/History', [
            'predictions' => $predictions,
        ]);
    }

    /**
     * Tampilkan statistik model
     */
    public function statistics()
    {
        try {
            $response = Http::get("{$this->mlServiceUrl}/statistics");
            $statistics = $response->successful() ? $response->json() : null;

            // Fetch curves data (ROC, PR, Calibration)
            $curvesData = null;
            try {
                $curvesResponse = Http::get("{$this->mlServiceUrl}/curves");
                $curvesData = $curvesResponse->successful() ? $curvesResponse->json() : null;
            } catch (\Exception $e) {
                $curvesData = null;
            }

            // Fetch interpretability data (OR, feature importance)
            $interpretabilityData = null;
            try {
                $interpResponse = Http::get("{$this->mlServiceUrl}/interpretability");
                $interpretabilityData = $interpResponse->successful() ? $interpResponse->json() : null;
            } catch (\Exception $e) {
                $interpretabilityData = null;
            }

            // Fetch external validation data (kohort Gowa / TBC.03)
            $externalValidation = null;
            try {
                $extResponse = Http::get("{$this->mlServiceUrl}/external-validation");
                $externalValidation = $extResponse->successful() ? $extResponse->json() : null;
            } catch (\Exception $e) {
                $externalValidation = null;
            }

            // Fetch DCA data (Decision Curve Analysis + kontribusi per variabel)
            $dcaData = null;
            try {
                $dcaResponse = Http::get("{$this->mlServiceUrl}/dca");
                $dcaData = $dcaResponse->successful() ? $dcaResponse->json() : null;
            } catch (\Exception $e) {
                $dcaData = null;
            }

            // Filter out models that are disabled by the Admin
            if ($statistics && isset($statistics['evaluation_results'])) {
                $activeModels = \App\Models\ActiveModel::where('is_active', true)->pluck('model_name')->toArray();

                // Helper to filter keyed arrays by active models
                $filterByActive = function ($data) use ($activeModels) {
                    if (!$data || !is_array($data)) return $data;
                    $filtered = [];
                    foreach ($data as $modelName => $value) {
                        if (in_array($modelName, $activeModels)) {
                            $filtered[$modelName] = $value;
                        }
                    }
                    return $filtered;
                };

                $statistics['evaluation_results'] = $filterByActive($statistics['evaluation_results']);
                $statistics['cv_results'] = $filterByActive($statistics['cv_results'] ?? null);
                $statistics['comparison_table'] = $filterByActive($statistics['comparison_table'] ?? null);
                $statistics['best_params'] = $filterByActive($statistics['best_params'] ?? null);
                $statistics['bootstrap_ci'] = $filterByActive($statistics['bootstrap_ci'] ?? null);

                // Filter curves & interpretability data
                $curvesData = $filterByActive($curvesData);
                $interpretabilityData = $filterByActive($interpretabilityData);

                // Recalculate best active model
                $bestScore = -1;
                $activeBestModel = null;
                if (!empty($statistics['cv_results'])) {
                    foreach ($statistics['cv_results'] as $modelName => $cv) {
                        if ($cv['f1']['mean'] > $bestScore) {
                            $bestScore = $cv['f1']['mean'];
                            $activeBestModel = $modelName;
                        }
                    }
                }
                $statistics['best_model'] = $activeBestModel;
            }

            // Tambah distribusi kelas data mentah (dari tabel training_data di MySQL)
            // supaya halaman bisa membandingkan dengan distribusi data bersih dari ML service.
            if ($statistics) {
                $rawBerhasil = (int) \App\Models\TrainingData::where('keberhasilan_pengobatan', 'Berhasil')->count();
                $rawTidak = (int) \App\Models\TrainingData::where('keberhasilan_pengobatan', 'Tidak Berhasil')->count();
                $rawTotal = $rawBerhasil + $rawTidak;
                $statistics['raw_class_distribution'] = [
                    'counts' => [
                        '0' => $rawBerhasil,
                        '1' => $rawTidak,
                    ],
                    'total' => $rawTotal,
                ];
            }

        }
        catch (\Exception $e) {
            $statistics = null;
            $curvesData = null;
            $interpretabilityData = null;
            $externalValidation = null;
            $dcaData = null;
        }

        return Inertia::render('Prediction/Statistics', [
            'statistics' => $statistics,
            'curves' => $curvesData,
            'interpretability' => $interpretabilityData,
            'externalValidation' => $externalValidation,
            'dca' => $dcaData,
            'error' => $statistics === null || empty($statistics['evaluation_results']) ? 'Tidak dapat mengambil statistik atau belum ada model aktif dari ML Service' : null,
        ]);
    }

    /**
     * Tampilkan halaman komparasi SMOTE vs Non-SMOTE
     * Halaman ini hanya menampilkan UI; data komparasi diambil via AJAX
     * ke endpoint POST /api/compare-smote saat user klik tombol "Jalankan Komparasi".
     */
    public function compareSmote()
    {
        $totalRecords = \App\Models\TrainingData::count();

        return Inertia::render('Prediction/CompareSmote', [
            'totalRecords' => $totalRecords,
            'mlServiceUrl' => env('ML_SERVICE_URL', 'http://localhost:5000'),
        ]);
    }

    /**
     * Detail prediksi
     */
    /**
     * Tampilkan detail prediksi. Attribusi per-fitur (SHAP) difetch on-demand
     * dari ML service /explain agar prediksi lama (tanpa tersimpan) tetap dapat angka.
     */
    public function show(Prediction $prediction)
    {
        $factorContributions = $prediction->factor_contributions;

        // Prediksi lama tanpa attribusi tersimpan ATAU versi attribusi yang
        // belum punya data detail -> hitung ulang via /explain agar tabel angka
        // perhitungan (Rincian) tetap tampil untuk semua model.
        $needsRefresh = empty($factorContributions) ||
            ($prediction->model_used === 'Logistic Regression' && !isset($factorContributions['z_final'])) ||
            ($prediction->model_used === 'Logistic Regression' && isset($factorContributions['features'][0]) && !isset($factorContributions['features'][0]['scaled_value'])) ||
            (in_array($prediction->model_used, ['Decision Tree', 'Support Vector Machine']) && !isset($factorContributions['type'])) ||
            ($prediction->model_used === 'Support Vector Machine' && !isset($factorContributions['shap']));
        if ($needsRefresh) {
            try {
                $payload = $this->buildMlInput($prediction->patient_data);
                $payload['model_name'] = $prediction->model_used;
                $response = Http::post(
                    "{$this->mlServiceUrl}/explain",
                    $payload
                );
                if ($response->successful()) {
                    $factorContributions = $response->json()['factor_contributions'] ?? null;
                }
            } catch (\Exception $e) {
                $factorContributions = null;
            }
        }

        return Inertia::render('Prediction/Show', [
            'prediction' => $prediction,
            'factorContributions' => $factorContributions,
        ]);
    }

    /**
     * Mapping data form/patient ke kunci yang dimengerti ML service.
     */
    private function buildMlInput(array $data): array
    {
        $mlInput = [
            'Usia' => $data['usia'] ?? '',
            'Ket.Usia' => (int)($data['ket_usia'] ?? 0),
            'Jenis Kelamin' => $data['jenis_kelamin'] ?? '',
            'Status Bekerja' => $data['status_bekerja'] ?? '',
            'BB' => (float)($data['bb'] ?? 0),
            'TB' => (float)($data['tb'] ?? 0),
            'IMT' => (float)($data['imt'] ?? 0),
            'Status Gizi' => $data['status_gizi'] ?? '',
            'Status Merokok' => $data['status_merokok'] ?? '',
            'Pemeriksaan Kontak' => $data['pemeriksaan_kontak'] ?? '',
            'Riwayat_DM' => $data['riwayat_dm'] ?? '',
            'Riwayat_HIV' => $data['riwayat_hiv'] ?? '',
            'Komorbiditas' => $data['komorbiditas'] ?? '',
            'Kepatuhan Minum Obat' => $data['kepatuhan_minum_obat'] ?? '',
            'Efek Samping Obat' => $data['efek_samping_obat'] ?? '',
            'Riwayat Pengobatan Sebelumnya' => $data['riwayat_pengobatan'] ?? '',
            'Panduan Pengobatan' => $data['panduan_pengobatan'] ?? '',
        ];

        if (!empty($data['model_name']) && $data['model_name'] !== 'auto') {
            $mlInput['model_name'] = $data['model_name'];
        }

        return $mlInput;
    }

    /**
     * Hapus prediksi
     */
    public function destroy(Prediction $prediction)
    {
        $prediction->delete();

        return redirect()->route('prediction.history')->with('success', 'Prediksi berhasil dihapus');
    }
}
