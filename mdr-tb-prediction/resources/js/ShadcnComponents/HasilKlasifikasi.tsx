import { Card, CardContent, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { cn } from '@/lib/utils';
import { LABEL } from '@/lib/variabel';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

interface HasilProps {
    prediction: string;
    confidence: number;
    probabilities: { Berhasil: number; 'Tidak Berhasil': number };
    modelUsed: string;
}

/**
 * Ringkasan hasil klasifikasi beserta probabilitas tiap kelas.
 * Sistem bersifat alat bantu; keputusan akhir tetap pada tenaga medis
 * (Bab II.A.20).
 */
export function HasilKlasifikasi({
    prediction,
    confidence,
    probabilities,
    modelUsed,
}: HasilProps) {
    const berhasil = prediction === 'Berhasil';

    return (
        <Card
            className={cn(
                'border-2',
                berhasil
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                    : 'border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
            )}
        >
            <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        {berhasil ? (
                            <CheckCircle2 className="mt-0.5 size-8 shrink-0 text-emerald-600" />
                        ) : (
                            <TriangleAlert className="mt-0.5 size-8 shrink-0 text-red-600" />
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Hasil Klasifikasi
                            </p>
                            <p
                                className={cn(
                                    'text-2xl font-bold',
                                    berhasil
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-red-700 dark:text-red-400',
                                )}
                            >
                                {prediction}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {berhasil
                                    ? 'Pasien diklasifikasikan berpotensi berhasil menyelesaikan pengobatan.'
                                    : 'Pasien diklasifikasikan berisiko gagal pengobatan dan memerlukan pemantauan lebih intensif.'}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Tingkat Keyakinan</p>
                        <p className="text-2xl font-bold tabular-nums">
                            {confidence.toFixed(2)}%
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Model: {modelUsed}
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <p className="text-sm font-medium">Probabilitas Tiap Kelas</p>
                    {(
                        [
                            ['Berhasil', probabilities.Berhasil, 'bg-emerald-500'],
                            [
                                'Tidak Berhasil',
                                probabilities['Tidak Berhasil'],
                                'bg-red-500',
                            ],
                        ] as const
                    ).map(([label, nilai, warna]) => (
                        <div key={label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>{label}</span>
                                <span className="font-medium tabular-nums">
                                    {nilai.toFixed(2)}%
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn('h-full rounded-full', warna)}
                                    style={{ width: `${nilai}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-6 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    Hasil klasifikasi merupakan alat bantu pendukung keputusan. Keputusan
                    klinis akhir tetap berada pada tenaga medis.
                </p>
            </CardContent>
        </Card>
    );
}

interface DataPasienProps {
    data: Record<string, string | number | null>;
    imt?: number;
}

/** Tabel data pasien yang menjadi masukan model. */
export function DataPasien({ data, imt }: DataPasienProps) {
    const urutan = [
        'ket_usia',
        'usia',
        'jenis_kelamin',
        'status_bekerja',
        'bb',
        'tb',
        'status_gizi',
        'status_merokok',
        'pemeriksaan_kontak',
        'riwayat_dm',
        'riwayat_hiv',
        'komorbiditas',
        'kepatuhan_minum_obat',
        'efek_samping_obat',
        'riwayat_pengobatan',
        'panduan_pengobatan',
    ];

    // Menandai nilai yang berasosiasi dengan risiko kegagalan pengobatan
    const nilaiRisiko = new Set([
        'Tidak Patuh',
        'Ada Keluhan',
        'Pengobatan Ulang',
        'Merokok',
        'Gizi Kurang',
        'Usia Lanjut',
        'Jangka Panjang',
    ]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Data Pasien</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {urutan.length + 1} variabel yang digunakan sebagai masukan model.
                </p>
            </CardHeader>
            <CardContent>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {urutan.map((kunci) => {
                        const nilai = data[kunci];
                        const berisiko =
                            typeof nilai === 'string' && nilaiRisiko.has(nilai);

                        return (
                            <div
                                key={kunci}
                                className="flex items-baseline justify-between gap-3 border-b pb-2"
                            >
                                <dt className="text-sm text-muted-foreground">
                                    {LABEL[kunci] ?? kunci}
                                </dt>
                                <dd
                                    className={cn(
                                        'text-right text-sm font-medium',
                                        berisiko && 'text-red-600 dark:text-red-400',
                                    )}
                                >
                                    {nilai ?? '-'}
                                </dd>
                            </div>
                        );
                    })}

                    {imt !== undefined && (
                        <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                            <dt className="text-sm text-muted-foreground">{LABEL.imt}</dt>
                            <dd className="text-right text-sm font-medium tabular-nums">
                                {imt > 0 ? imt : '-'}
                            </dd>
                        </div>
                    )}
                </dl>

                {data.keterangan_efek_samping && (
                    <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">
                            {LABEL.keterangan_efek_samping}
                        </p>
                        <p className="mt-1 text-sm">{data.keterangan_efek_samping}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
