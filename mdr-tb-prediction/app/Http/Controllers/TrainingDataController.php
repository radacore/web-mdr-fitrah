<?php

namespace App\Http\Controllers;

use App\Models\TrainingData;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrainingDataController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = TrainingData::query();

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('jenis_kelamin', 'like', "%{$search}%")
                    ->orWhere('status_gizi', 'like', "%{$search}%")
                    ->orWhere('keberhasilan_pengobatan', 'like', "%{$search}%");
            });
        }

        // Filter by outcome
        if ($request->has('outcome') && $request->outcome) {
            $query->where('keberhasilan_pengobatan', $request->outcome);
        }

        $trainingData = $query->orderBy('created_at', 'desc')->paginate(15);

        $total = TrainingData::count();
        $testingCount = (int) ceil($total * 0.15);
        $remainingAfterTest = $total - $testingCount;
        $validationCount = (int) ceil($remainingAfterTest * (0.15 / 0.85));
        $trainingCount = $total - $testingCount - $validationCount;

        return Inertia::render('TrainingData/Index', [
            'trainingData' => $trainingData,
            'filters' => $request->only(['search', 'outcome']),
            'stats' => [
                'total' => $total,
                'berhasil' => TrainingData::where('keberhasilan_pengobatan', 'Berhasil')->count(),
                'tidak_berhasil' => TrainingData::where('keberhasilan_pengobatan', 'Tidak Berhasil')->count(),
                'data_training' => $trainingCount,
                'data_validation' => $validationCount,
                'data_testing' => $testingCount,
            ],
        ]);
    }

    /**
     * Tampilkan halaman pembersihan data: 24 baris yang dibuang preprocessing
     * (replikasi `DataPreprocessor.remove_outliers` ML service: IQR Tukey
     * pada kolom numeric ket_usia, bb, tb, imt, dijalankan sekuensial).
     */
    public function cleaning()
    {
        $all = TrainingData::orderBy('id')->get();
        $total = $all->count();

        $numericalCols = ['ket_usia', 'bb', 'tb', 'imt'];
        $colLabels = [
            'ket_usia' => 'Ket. Usia (tahun)',
            'bb'       => 'BB (kg)',
            'tb'       => 'TB (cm)',
            'imt'      => 'IMT',
        ];

        // Drop missing values: mirror dropna() pada kolom yang dipakai model.
        // Field nullable yang tidak ikut training (keterangan_efek_samping) tidak diperhitungkan.
        $requiredCols = [
            'usia', 'ket_usia', 'jenis_kelamin', 'status_bekerja', 'bb', 'tb', 'imt',
            'status_gizi', 'status_merokok', 'pemeriksaan_kontak', 'riwayat_dm',
            'riwayat_hiv', 'komorbiditas', 'kepatuhan_minum_obat', 'efek_samping_obat',
            'riwayat_pengobatan', 'panduan_pengobatan', 'keberhasilan_pengobatan',
        ];

        $kept = collect();
        $dropped = []; // each: ['row' => model, 'reason' => string, 'detail' => array]

        foreach ($all as $row) {
            $missing = [];
            foreach ($requiredCols as $col) {
                $v = $row->{$col};
                if ($v === null || $v === '') {
                    $missing[] = $col;
                }
            }
            if (!empty($missing)) {
                $dropped[] = [
                    'row' => $row,
                    'reason' => 'Missing value',
                    'detail' => ['kolom' => $missing],
                ];
            } else {
                $kept->push($row);
            }
        }

        $dropMissingCount = count($dropped);

        // Feature engineering: cast BB & TB ke int lalu recompute IMT = BB / (TB/100)^2,
        // identik dengan DataPreprocessor.feature_engineering di ML service.
        // Tanpa recompute, IQR pada kolom IMT raw akan ikut membuang baris extra
        // sehingga total dibuang jadi 26 (bukan 24 seperti pipeline ML).
        $kept = $kept->map(function ($row) {
            $bb = (int) round((float) $row->bb);
            $tb = (int) round((float) $row->tb);
            $row->bb = $bb;
            $row->tb = $tb;
            $row->imt = $tb > 0 ? round($bb / pow($tb / 100, 2), 2) : (float) $row->imt;
            return $row;
        });

        // IQR sequential, identik dengan preprocessing.remove_outliers
        $stepStats = []; // per-kolom: q1, q3, iqr, lower, upper, dropped
        foreach ($numericalCols as $col) {
            $values = $kept->pluck($col)->map(fn($v) => (float) $v)->sort()->values()->all();
            $n = count($values);
            if ($n === 0) {
                $stepStats[$col] = null;
                continue;
            }
            $q1 = $this->quantile($values, 0.25);
            $q3 = $this->quantile($values, 0.75);
            $iqr = $q3 - $q1;
            $lower = $q1 - 1.5 * $iqr;
            $upper = $q3 + 1.5 * $iqr;

            $beforeCount = $kept->count();
            $newKept = collect();
            foreach ($kept as $row) {
                $val = (float) $row->{$col};
                if ($val < $lower || $val > $upper) {
                    $dropped[] = [
                        'row' => $row,
                        'reason' => 'Outlier IQR',
                        'detail' => [
                            'kolom' => $colLabels[$col],
                            'nilai' => $val,
                            'batas_bawah' => round($lower, 2),
                            'batas_atas' => round($upper, 2),
                        ],
                    ];
                } else {
                    $newKept->push($row);
                }
            }
            $kept = $newKept;
            $stepStats[$col] = [
                'kolom' => $colLabels[$col],
                'q1' => round($q1, 2),
                'q3' => round($q3, 2),
                'iqr' => round($iqr, 2),
                'lower' => round($lower, 2),
                'upper' => round($upper, 2),
                'dibuang' => $beforeCount - $kept->count(),
                'sisa' => $kept->count(),
            ];
        }

        // Format dropped rows untuk frontend
        $droppedRows = collect($dropped)->map(function ($d) {
            $r = $d['row'];
            return [
                'id' => $r->id,
                'usia' => $r->usia,
                'ket_usia' => (int) $r->ket_usia,
                'jenis_kelamin' => $r->jenis_kelamin,
                'bb' => (float) $r->bb,
                'tb' => (float) $r->tb,
                'imt' => (float) $r->imt,
                'keberhasilan_pengobatan' => $r->keberhasilan_pengobatan,
                'reason' => $d['reason'],
                'detail' => $d['detail'],
            ];
        })->values();

        return Inertia::render('TrainingData/Cleaning', [
            'summary' => [
                'total_raw' => $total,
                'total_cleaned' => $kept->count(),
                'total_dropped' => $total - $kept->count(),
                'dropped_missing' => $dropMissingCount,
                'dropped_outlier' => ($total - $kept->count()) - $dropMissingCount,
                'percent_dropped' => $total > 0 ? round((($total - $kept->count()) / $total) * 100, 2) : 0,
            ],
            'iqr_steps' => $stepStats,
            'dropped_rows' => $droppedRows,
        ]);
    }

    /**
     * Tampilkan halaman Hybrid Feature Selection: verdict per-fitur
     * (Accepted/Rejected + alasan) dari ML service /feature-selection.
     * Mencerminkan metodologi Filter-Wrapper (Kelompok A/B/C + pra-seleksi).
     */
    public function featureSelection()
    {
        $mlServiceUrl = env('ML_SERVICE_URL', 'http://localhost:5000');
        $featureSelection = null;
        $error = null;

        try {
            $response = \Illuminate\Support\Facades\Http::get("{$mlServiceUrl}/feature-selection");
            if ($response->successful()) {
                $featureSelection = $response->json();
            } else {
                $error = 'Feature selection belum tersedia. Jalankan retrain pada ML Service.';
            }
        } catch (\Exception $e) {
            $error = 'Tidak dapat terhubung ke ML Service. Jalankan ML Service terlebih dahulu.';
        }

        return Inertia::render('TrainingData/FeatureSelection', [
            'featureSelection' => $featureSelection,
            'error' => $error,
        ]);
    }

    /**
     * Linear interpolation quantile (sama dengan default pandas.quantile).
     */
    protected function quantile(array $sortedValues, float $q): float
    {
        $n = count($sortedValues);
        if ($n === 0) {
            return 0.0;
        }
        if ($n === 1) {
            return $sortedValues[0];
        }
        $pos = ($n - 1) * $q;
        $lo = (int) floor($pos);
        $hi = (int) ceil($pos);
        if ($lo === $hi) {
            return $sortedValues[$lo];
        }
        $frac = $pos - $lo;
        return $sortedValues[$lo] + ($sortedValues[$hi] - $sortedValues[$lo]) * $frac;
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('TrainingData/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'usia' => 'required|string',
            'ket_usia' => 'required|integer|min:1|max:120',
            'jenis_kelamin' => 'required|string',
            'status_bekerja' => 'required|string',
            'bb' => 'required|numeric|min:1',
            'tb' => 'required|numeric|min:50',
            'imt' => 'required|numeric',
            'status_gizi' => 'required|string',
            'status_merokok' => 'required|string',
            'pemeriksaan_kontak' => 'required|string',
            'riwayat_dm' => 'required|string',
            'riwayat_hiv' => 'required|string',
            'komorbiditas' => 'required|string',
            'kepatuhan_minum_obat' => 'required|string',
            'efek_samping_obat' => 'required|string',
            'keterangan_efek_samping' => 'nullable|string',
            'riwayat_pengobatan' => 'required|string',
            'panduan_pengobatan' => 'required|string',
            'keberhasilan_pengobatan' => 'required|string',
        ]);

        TrainingData::create($validated);

        return redirect()->route('training-data.index')
            ->with('success', 'Data training berhasil ditambahkan.');
    }

    /**
     * Display the specified resource.
     */
    public function show(TrainingData $trainingData)
    {
        return Inertia::render('TrainingData/Show', [
            'trainingData' => $trainingData,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TrainingData $trainingData)
    {
        return Inertia::render('TrainingData/Edit', [
            'trainingData' => $trainingData,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TrainingData $trainingData)
    {
        $validated = $request->validate([
            'usia' => 'required|string',
            'ket_usia' => 'required|integer|min:1|max:120',
            'jenis_kelamin' => 'required|string',
            'status_bekerja' => 'required|string',
            'bb' => 'required|numeric|min:1',
            'tb' => 'required|numeric|min:50',
            'imt' => 'required|numeric',
            'status_gizi' => 'required|string',
            'status_merokok' => 'required|string',
            'pemeriksaan_kontak' => 'required|string',
            'riwayat_dm' => 'required|string',
            'riwayat_hiv' => 'required|string',
            'komorbiditas' => 'required|string',
            'kepatuhan_minum_obat' => 'required|string',
            'efek_samping_obat' => 'required|string',
            'keterangan_efek_samping' => 'nullable|string',
            'riwayat_pengobatan' => 'required|string',
            'panduan_pengobatan' => 'required|string',
            'keberhasilan_pengobatan' => 'required|string',
        ]);

        $trainingData->update($validated);

        return redirect()->route('training-data.index')
            ->with('success', 'Data training berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TrainingData $trainingData)
    {
        $trainingData->delete();

        return redirect()->route('training-data.index')
            ->with('success', 'Data training berhasil dihapus.');
    }
}
