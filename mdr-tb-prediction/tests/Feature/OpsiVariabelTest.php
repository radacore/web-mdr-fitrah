<?php

namespace Tests\Feature;

use App\Models\TrainingData;
use Tests\TestCase;

/**
 * Menjaga agar opsi pada formulir front-end tetap sinkron dengan aturan
 * validasi dan istilah pada basis data. Ketidakcocokan seperti ini pernah
 * menyebabkan dropdown "Riwayat Pengobatan Sebelumnya" kosong pada form edit,
 * karena database berisi "Kasus Lama" sedangkan formulir hanya menawarkan
 * "Pengobatan Ulang".
 */
class OpsiVariabelTest extends TestCase
{
    public function test_variabel_ts_sinkron_dengan_opsi_kategorik(): void
    {
        $isi = file_get_contents(base_path('resources/js/lib/variabel.ts'));

        foreach (TrainingData::OPSI_KATEGORIK as $variabel => $nilaiDiharapkan) {
            $blok = $this->ambilBlokOpsi($isi, $variabel);

            $this->assertNotNull(
                $blok,
                "Variabel '$variabel' tidak ditemukan pada OPSI di resources/js/lib/variabel.ts"
            );

            $nilaiFrontend = $this->uraikanNilai($blok);
            sort($nilaiFrontend);
            $nilaiTerurut = $nilaiDiharapkan;
            sort($nilaiTerurut);

            $this->assertSame(
                $nilaiTerurut,
                $nilaiFrontend,
                "Opsi variabel '$variabel' pada frontend berbeda dengan TrainingData::OPSI_KATEGORIK"
            );
        }
    }

    /**
     * Aturan validasi 'in:' pada TrainingData berbanding lurus dengan
     * OPSI_KATEGORIK, sehingga aturan validasi otomatis mengikuti perubahan
     * daftar nilai yang diperbolehkan.
     */
    public function test_aturan_validasi_menolak_nilai_di_luar_opsi(): void
    {
        $aturan = TrainingData::aturanKategorik('riwayat_pengobatan');

        $this->assertSame('in:Kasus Baru,Kasus Lama', $aturan);
    }

    private function ambilBlokOpsi(string $isi, string $variabel): ?string
    {
        preg_match(
            '/'.preg_quote($variabel, '/').':\s*\[([^\]]*)\]/',
            $isi,
            $cocok,
        );

        return $cocok[1] ?? null;
    }

    /**
     * @return list<string>
     */
    private function uraikanNilai(string $blok): array
    {
        preg_match_all("/'([^']+)'/", $blok, $cocok);

        return $cocok[1];
    }
}
