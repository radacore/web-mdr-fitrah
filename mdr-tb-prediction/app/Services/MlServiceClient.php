<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Penghubung aplikasi web Laravel dengan layanan machine learning Python.
 *
 * Model Random Forest dibangun dengan Python, lalu diintegrasikan ke aplikasi
 * web melalui Application Programming Interface (API) sebagaimana dijelaskan
 * pada Bab II.A.8 dan II.A.20 proposal.
 */
class MlServiceClient
{
    /**
     * Pemetaan nama kolom basis data ke nama variabel pada layanan ML.
     * Mencakup 17 variabel penelitian sesuai Ruang Lingkup Penelitian.
     */
    private const FIELD_MAP = [
        'usia' => 'usia',
        'ket_usia' => 'ket_usia',
        'jenis_kelamin' => 'jenis_kelamin',
        'status_bekerja' => 'status_bekerja',
        'bb' => 'bb',
        'tb' => 'tb',
        'status_gizi' => 'status_gizi',
        'status_merokok' => 'status_merokok',
        'pemeriksaan_kontak' => 'pemeriksaan_kontak',
        'riwayat_dm' => 'riwayat_dm',
        'riwayat_hiv' => 'riwayat_hiv',
        'komorbiditas' => 'komorbiditas',
        'kepatuhan_minum_obat' => 'kepatuhan_minum_obat',
        'efek_samping_obat' => 'efek_samping_obat',
        'riwayat_pengobatan' => 'riwayat_pengobatan',
        'panduan_pengobatan' => 'panduan_pengobatan',
    ];

    private const NUMERIC_FIELDS = ['ket_usia', 'bb', 'tb'];

    public function __construct(
        private readonly string $baseUrl,
        private readonly int $timeout = 30,
    ) {}

    public static function make(): self
    {
        return new self(
            baseUrl: rtrim(config('ml.url'), '/'),
            timeout: (int) config('ml.timeout'),
        );
    }

    /**
     * Menyusun payload prediksi dari data pasien.
     * IMT tidak dikirim karena dihitung ulang oleh layanan ML dari BB dan TB.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function buildPredictionPayload(array $data): array
    {
        $payload = [];

        foreach (self::FIELD_MAP as $sumber => $tujuan) {
            $nilai = $data[$sumber] ?? null;

            $payload[$tujuan] = in_array($sumber, self::NUMERIC_FIELDS, true)
                ? (float) $nilai
                : (string) $nilai;
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     *
     * @throws \RuntimeException
     */
    public function predict(array $data): array
    {
        return $this->post('/predict', $this->buildPredictionPayload($data));
    }

    /**
     * @return array<string, mixed>
     */
    public function features(): array
    {
        return $this->get('/features');
    }

    /**
     * @return array<string, mixed>
     */
    public function statistics(): array
    {
        return $this->get('/statistics');
    }

    /**
     * @return array<string, mixed>
     */
    public function health(): array
    {
        return $this->get('/health', timeout: 5);
    }

    /**
     * Pelatihan ulang model menggunakan data rekam medis dari basis data.
     *
     * @param  array<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    public function retrain(array $records, bool $useSmote = true): array
    {
        return $this->post(
            '/retrain',
            ['data' => $records, 'use_smote' => $useSmote],
            timeout: (int) config('ml.timeout_training'),
        );
    }

    /**
     * Skenario pengujian tanpa SMOTE dibandingkan dengan SMOTE.
     *
     * @param  array<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    public function compareSmote(array $records): array
    {
        return $this->post(
            '/compare-smote',
            ['data' => $records],
            timeout: (int) config('ml.timeout_scenario'),
        );
    }

    /**
     * Skenario variasi proporsi pembagian data dan jumlah pohon.
     *
     * @param  array<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    public function testScenarios(array $records): array
    {
        return $this->post(
            '/test-scenarios',
            ['data' => $records],
            timeout: (int) config('ml.timeout_scenario'),
        );
    }

    public function isReachable(): bool
    {
        try {
            return ($this->health()['status'] ?? null) === 'healthy';
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function get(string $path, ?int $timeout = null): array
    {
        try {
            $response = Http::timeout($timeout ?? $this->timeout)->get($this->baseUrl.$path);
        } catch (ConnectionException $e) {
            throw new \RuntimeException(
                'Layanan machine learning tidak dapat dihubungi. Pastikan layanan sudah berjalan.',
                previous: $e,
            );
        }

        return $this->unwrap($response);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function post(string $path, array $payload, ?int $timeout = null): array
    {
        try {
            $response = Http::timeout($timeout ?? $this->timeout)->post($this->baseUrl.$path, $payload);
        } catch (ConnectionException $e) {
            throw new \RuntimeException(
                'Layanan machine learning tidak dapat dihubungi. Pastikan layanan sudah berjalan.',
                previous: $e,
            );
        }

        return $this->unwrap($response);
    }

    /**
     * @return array<string, mixed>
     */
    private function unwrap(\Illuminate\Http\Client\Response $response): array
    {
        if ($response->failed()) {
            $pesan = $response->json('error') ?? 'Layanan machine learning mengembalikan kesalahan.';
            throw new \RuntimeException($pesan);
        }

        return $response->json() ?? [];
    }
}
