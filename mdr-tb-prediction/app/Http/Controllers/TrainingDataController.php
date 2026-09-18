<?php

namespace App\Http\Controllers;

use App\Models\TrainingData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pengelolaan data rekam medis pasien MDR-TB yang digunakan sebagai
 * dataset pelatihan model (Bab III.C.2 Pengumpulan Data).
 */
class TrainingDataController extends Controller
{
    /**
     * Aturan validasi 17 variabel penelitian beserta variabel target.
     *
     * Kategori usia (usia) dan IMT tidak divalidasi karena merupakan variabel
     * turunan yang dihitung dari usia dalam tahun serta berat dan tinggi badan.
     *
     * @return array<string, string>
     */
    private function rules(): array
    {
        return [
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
            'keberhasilan_pengobatan' => ['required', 'string', TrainingData::aturanKategorik('keberhasilan_pengobatan')],
        ];
    }

    public function index(Request $request): Response
    {
        $query = TrainingData::query()->latest();

        if ($cari = $request->input('search')) {
            $query->where(function ($q) use ($cari) {
                $q->where('jenis_kelamin', 'like', "%{$cari}%")
                    ->orWhere('status_gizi', 'like', "%{$cari}%")
                    ->orWhere('keberhasilan_pengobatan', 'like', "%{$cari}%");
            });
        }

        if ($outcome = $request->input('outcome')) {
            $query->where('keberhasilan_pengobatan', $outcome);
        }

        $total = TrainingData::count();
        $berhasil = TrainingData::where('keberhasilan_pengobatan', 'Berhasil')->count();
        $tidakBerhasil = TrainingData::where('keberhasilan_pengobatan', 'Tidak Berhasil')->count();

        // Pembagian data latih dan data uji dengan proporsi 80:20 (Bab III.C.4)
        $ukuranUji = (int) ceil($total * 0.2);

        return Inertia::render('TrainingData/Index', [
            'trainingData' => $query->paginate(15)->withQueryString(),
            'filters' => $request->only(['search', 'outcome']),
            'stats' => [
                'total' => $total,
                'berhasil' => $berhasil,
                'tidak_berhasil' => $tidakBerhasil,
                'persen_berhasil' => $total > 0 ? round($berhasil / $total * 100, 2) : 0,
                'persen_tidak_berhasil' => $total > 0 ? round($tidakBerhasil / $total * 100, 2) : 0,
                'rasio_ketidakseimbangan' => $tidakBerhasil > 0
                    ? round(max($berhasil, $tidakBerhasil) / min($berhasil, $tidakBerhasil), 2)
                    : 0,
                'kelas_minoritas' => $tidakBerhasil < $berhasil ? 'Tidak Berhasil' : 'Berhasil',
                'training_count' => $total - $ukuranUji,
                'testing_count' => $ukuranUji,
                'split_ratio' => '80:20',
            ],
        ]);
    }

    /**
     * Ringkasan tahap data cleaning (Bab III.C.4): penanganan data duplikat
     * dan nilai yang hilang pada dataset rekam medis.
     */
    public function cleaning(): Response
    {
        $semua = TrainingData::all();
        $totalAwal = $semua->count();

        // Kolom wajib. Kolom keterangan efek samping dikecualikan karena
        // berupa teks bebas dan tidak digunakan sebagai fitur model.
        $kolomWajib = [
            'usia', 'ket_usia', 'jenis_kelamin', 'status_bekerja', 'bb', 'tb',
            'status_gizi', 'status_merokok', 'pemeriksaan_kontak', 'riwayat_dm',
            'riwayat_hiv', 'komorbiditas', 'kepatuhan_minum_obat',
            'efek_samping_obat', 'riwayat_pengobatan', 'panduan_pengobatan',
            'keberhasilan_pengobatan',
        ];

        $barisDibuang = [];
        $sudahDilihat = [];
        $bersih = [];

        foreach ($semua as $baris) {
            $kolomKosong = [];
            foreach ($kolomWajib as $kolom) {
                if ($baris->{$kolom} === null || $baris->{$kolom} === '') {
                    $kolomKosong[] = $kolom;
                }
            }

            if ($kolomKosong !== []) {
                $barisDibuang[] = [
                    'id' => $baris->id,
                    'alasan' => 'Nilai hilang',
                    'detail' => 'Kolom kosong: '.implode(', ', $kolomKosong),
                    'data' => $baris->only($kolomWajib),
                ];

                continue;
            }

            // Deteksi duplikat berdasarkan kombinasi seluruh nilai variabel
            $sidikJari = md5(implode('|', array_map(
                fn (string $kolom) => (string) $baris->{$kolom},
                $kolomWajib
            )));

            if (isset($sudahDilihat[$sidikJari])) {
                $barisDibuang[] = [
                    'id' => $baris->id,
                    'alasan' => 'Data duplikat',
                    'detail' => 'Identik dengan data ID '.$sudahDilihat[$sidikJari],
                    'data' => $baris->only($kolomWajib),
                ];

                continue;
            }

            $sudahDilihat[$sidikJari] = $baris->id;
            $bersih[] = $baris;
        }

        $totalBersih = count($bersih);
        $jumlahDuplikat = collect($barisDibuang)->where('alasan', 'Data duplikat')->count();
        $jumlahMissing = collect($barisDibuang)->where('alasan', 'Nilai hilang')->count();

        return Inertia::render('TrainingData/Cleaning', [
            'summary' => [
                'total_awal' => $totalAwal,
                'total_bersih' => $totalBersih,
                'total_dibuang' => $totalAwal - $totalBersih,
                'dibuang_missing' => $jumlahMissing,
                'dibuang_duplikat' => $jumlahDuplikat,
                'persen_dibuang' => $totalAwal > 0
                    ? round(($totalAwal - $totalBersih) / $totalAwal * 100, 2)
                    : 0,
            ],
            'droppedRows' => $barisDibuang,
            'requiredColumns' => $kolomWajib,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('TrainingData/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->lengkapiVariabelTurunan(
            $request->validate($this->rules())
        );

        TrainingData::create($validated);

        return redirect()
            ->route('training-data.index')
            ->with('success', 'Data rekam medis berhasil ditambahkan.');
    }

    public function show(TrainingData $trainingData): Response
    {
        return Inertia::render('TrainingData/Show', [
            'trainingData' => $trainingData,
        ]);
    }

    public function edit(TrainingData $trainingData): Response
    {
        return Inertia::render('TrainingData/Edit', [
            'trainingData' => $trainingData,
        ]);
    }

    public function update(Request $request, TrainingData $trainingData): RedirectResponse
    {
        $validated = $this->lengkapiVariabelTurunan(
            $request->validate($this->rules())
        );

        $trainingData->update($validated);

        return redirect()
            ->route('training-data.index')
            ->with('success', 'Data rekam medis berhasil diperbarui.');
    }

    public function destroy(TrainingData $trainingData): RedirectResponse
    {
        $trainingData->delete();

        return redirect()
            ->route('training-data.index')
            ->with('success', 'Data rekam medis berhasil dihapus.');
    }

    /**
     * Melengkapi variabel turunan sebelum data disimpan. IMT dan kategori usia
     * dihitung ulang agar selalu selaras dengan berat, tinggi, dan usia pasien,
     * sesuai perhitungan pada layanan machine learning.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function lengkapiVariabelTurunan(array $data): array
    {
        $data['imt'] = TrainingData::hitungImt($data['bb'], $data['tb']);
        $data['usia'] = TrainingData::kategoriUsia($data['ket_usia']);

        return $data;
    }
}
