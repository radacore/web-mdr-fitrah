<?php

namespace App\Http\Controllers;

use App\Models\Prediction;
use App\Models\TrainingData;
use App\Services\MlServiceClient;
use App\Services\RekomendasiKlinis;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Klasifikasi keberhasilan pengobatan pasien MDR-TB menggunakan
 * teknik SMOTE dan algoritma Random Forest.
 */
class PredictionController extends Controller
{
    public function __construct(private readonly MlServiceClient $ml) {}

    /**
     * Formulir input data pasien oleh tenaga medis.
     */
    public function index(): Response
    {
        try {
            $features = $this->ml->features();
            $status = 'connected';
        } catch (\Throwable $e) {
            $features = null;
            $status = 'disconnected';
        }

        return Inertia::render('Prediction/Index', [
            'features' => $features,
            'mlServiceStatus' => $status,
        ]);
    }

    /**
     * Memproses data pasien melalui model Random Forest dan menyimpan hasilnya.
     *
     * Kategori usia dan IMT tidak diminta dari pengguna karena merupakan
     * variabel turunan yang dihitung dari usia, berat, dan tinggi badan.
     * Tanggal awal pengobatan juga bukan masukan model: nilainya dipakai untuk
     * menurunkan durasi dan status pengobatan pada tampilan.
     */
    public function predict(Request $request): RedirectResponse|Response
    {
        $validated = $request->validate([
            'nama_lengkap' => 'nullable|string|max:255',
            'ket_usia' => 'required|integer|min:1|max:120',
            'jenis_kelamin' => ['required', 'string', TrainingData::aturanKategorik('jenis_kelamin')],
            'status_bekerja' => ['required', 'string', TrainingData::aturanKategorik('status_bekerja')],
            'bb' => 'required|numeric|min:1',
            'tb' => 'required|numeric|min:50',
            'status_gizi' => ['required', 'string', TrainingData::aturanKategorik('status_gizi')],
            'status_merokok' => ['required', 'string', TrainingData::aturanKategorik('status_merokok')],
            'pemeriksaan_kontak' => ['required', 'string', TrainingData::aturanKategorik('pemeriksaan_kontak')],
            'riwayat_dm' => ['required', 'string', TrainingData::aturanKategorik('riwayat_dm')],
            'riwayat_hiv' => ['required', 'string', TrainingData::aturanKategorik('riwayat_hiv')],
            'komorbiditas' => ['required', 'string', TrainingData::aturanKategorik('komorbiditas')],
            'kepatuhan_minum_obat' => ['required', 'string', TrainingData::aturanKategorik('kepatuhan_minum_obat')],
            'efek_samping_obat' => ['required', 'string', TrainingData::aturanKategorik('efek_samping_obat')],
            'keterangan_efek_samping' => 'nullable|string',
            'riwayat_pengobatan' => ['required', 'string', TrainingData::aturanKategorik('riwayat_pengobatan')],
            'panduan_pengobatan' => ['required', 'string', TrainingData::aturanKategorik('panduan_pengobatan')],
            'tanggal_awal_pengobatan' => ['required', 'date', 'before_or_equal:'.TrainingData::hariIni()],
        ]);

        $validated['usia'] = TrainingData::kategoriUsia($validated['ket_usia']);
        $validated['imt'] = TrainingData::hitungImt($validated['bb'], $validated['tb']);

        // Durasi dan status disimpan sebagai potret kondisi saat klasifikasi,
        // sehingga riwayat tidak berubah seiring berjalannya waktu.
        $validated = array_merge(
            $validated,
            TrainingData::ringkasanPengobatan($validated['tanggal_awal_pengobatan']),
        );

        try {
            $result = $this->ml->predict($validated);
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        }

        $prediction = Prediction::create([
            'user_id' => $request->user()->id,
            'slug' => $this->buildSlug($validated['nama_lengkap'] ?? null),
            'patient_data' => $validated,
            'prediction_result' => $result['prediction'],
            'model_used' => $result['model_used'],
            'confidence_score' => $result['confidence'],
            'probabilities' => $result['probabilities'],
            'feature_importance' => $result['feature_importance'] ?? null,
        ]);

        return Inertia::render('Prediction/Result', [
            'prediction' => $prediction,
            'result' => $result,
            'input' => $validated,
            'rekomendasi' => RekomendasiKlinis::untuk($validated, $result['prediction']),
        ]);
    }

    /**
     * Riwayat klasifikasi. Admin melihat seluruh riwayat,
     * tenaga medis hanya melihat riwayat miliknya sendiri.
     */
    public function history(Request $request): Response
    {
        $user = $request->user();

        $query = Prediction::query()->with('user:id,name')->latest();

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        if ($hasil = $request->input('hasil')) {
            $query->where('prediction_result', $hasil);
        }

        return Inertia::render('Prediction/History', [
            'predictions' => $query->paginate(10)->withQueryString(),
            'filters' => $request->only(['hasil']),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function show(Request $request, Prediction $prediction): Response
    {
        $this->authorizeAccess($request, $prediction);

        $prediction->load('user:id,name');

        return Inertia::render('Prediction/Show', [
            'prediction' => $prediction,
            'rekomendasi' => RekomendasiKlinis::untuk(
                $prediction->patient_data ?? [],
                $prediction->prediction_result,
            ),
        ]);
    }

    public function destroy(Request $request, Prediction $prediction): RedirectResponse
    {
        $this->authorizeAccess($request, $prediction);

        $prediction->delete();

        return redirect()
            ->route('prediction.history')
            ->with('success', 'Riwayat klasifikasi berhasil dihapus.');
    }

    /**
     * Hasil evaluasi model: confusion matrix, metrik evaluasi,
     * hasil cross validation, dan feature importance.
     */
    public function statistics(): Response
    {
        try {
            $statistics = $this->ml->statistics();
            $error = null;
        } catch (\Throwable $e) {
            $statistics = null;
            $error = $e->getMessage();
        }

        return Inertia::render('Prediction/Statistics', [
            'statistics' => $statistics,
            'error' => $error,
            // Distribusi kelas pada basis data, untuk dibandingkan dengan
            // distribusi data bersih yang dilaporkan layanan ML
            'databaseDistribution' => [
                'Berhasil' => TrainingData::where('keberhasilan_pengobatan', 'Berhasil')->count(),
                'Tidak Berhasil' => TrainingData::where('keberhasilan_pengobatan', 'Tidak Berhasil')->count(),
                'total' => TrainingData::count(),
            ],
        ]);
    }

    /**
     * Skenario pengujian efektivitas SMOTE (Bab III.C.5).
     */
    public function compareSmote(): Response
    {
        return Inertia::render('Prediction/CompareSmote', [
            'totalRecords' => TrainingData::count(),
        ]);
    }

    /**
     * Skenario variasi proporsi pembagian data dan jumlah pohon (Bab III.C.5).
     */
    public function testScenarios(): Response
    {
        return Inertia::render('Prediction/TestScenarios', [
            'totalRecords' => TrainingData::count(),
        ]);
    }

    /**
     * Tenaga medis hanya boleh mengakses hasil klasifikasi miliknya sendiri.
     */
    private function authorizeAccess(Request $request, Prediction $prediction): void
    {
        $user = $request->user();

        if (! $user->isAdmin() && $prediction->user_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses pada hasil klasifikasi ini.');
        }
    }

    /**
     * Slug dibentuk dari inisial nama pasien agar identitas tidak terekspos
     * pada tautan, sesuai ketentuan etika penelitian (Bab II.A.19).
     */
    private function buildSlug(?string $nama): string
    {
        $inisial = collect(explode(' ', trim((string) $nama)))
            ->filter()
            ->map(fn (string $kata) => Str::upper(Str::substr($kata, 0, 1)))
            ->implode('');

        return ($inisial ?: 'P').'-'.Str::random(6);
    }
}
