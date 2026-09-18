import AppLayout from '@/Layouts/AppLayout';
import {
    ConfusionMatrixView,
    MetricCards,
} from '@/ShadcnComponents/EvaluationDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ShadcnComponents/ui/table';
import { formatAngka, formatPersen } from '@/lib/variabel';
import { ConfusionMatrix, CvResults, Metrics } from '@/types';
import { useMlProcess } from '@/hooks/use-ml-process';
import { Head } from '@inertiajs/react';
import { AlertCircle, Loader2, Play, TrendingDown, TrendingUp } from 'lucide-react';

interface Skenario {
    cv_results: CvResults;
    best_params: Record<string, string | number | null>;
    test_metrics: Metrics;
    train_metrics: Metrics | null;
    confusion_matrix: ConfusionMatrix;
    class_distribution: {
        latih_sebelum_smote: Record<string, number>;
        latih_setelah_smote: Record<string, number> | null;
    };
    split_info: { ratio: string; train_size: number; test_size_count: number };
    smote_applied: boolean;
}

interface Hasil {
    model: string;
    data_count: number;
    cleaned_data_count: number;
    no_smote: Skenario;
    with_smote: Skenario;
    selisih_data_uji: Metrics;
    selisih_cross_validation: Metrics;
    kesimpulan: string;
    error?: string;
}

interface Props {
    totalRecords: number;
}

const METRIK = [
    ['accuracy', 'Accuracy', 'accuracy'],
    ['precision', 'Precision', 'precision'],
    ['recall', 'Recall', 'recall'],
    ['f1_score', 'F1-Score', 'f1'],
] as const;

/** Sel selisih diberi warna sesuai arah perubahan. */
function SelSelisih({ selisih }: { selisih: number }) {
    const warna =
        selisih > 0.001
            ? 'text-emerald-600 dark:text-emerald-400'
            : selisih < -0.001
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground';

    return (
        <TableCell className={`text-right font-medium tabular-nums ${warna}`}>
            {selisih >= 0 ? '+' : ''}
            {formatPersen(selisih)}
        </TableCell>
    );
}

function KepalaPerbandingan() {
    return (
        <TableHeader>
            <TableRow>
                <TableHead>Metrik</TableHead>
                <TableHead className="text-right">Tanpa SMOTE</TableHead>
                <TableHead className="text-right">Dengan SMOTE</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
            </TableRow>
        </TableHeader>
    );
}

export default function CompareSmote({ totalRecords }: Props) {
    const {
        data: hasil,
        memuat,
        galat,
        jalankan,
    } = useMlProcess<Hasil>('/api/compare-smote');

    return (
        <AppLayout breadcrumbs={[{ label: 'Pengujian SMOTE' }]}>
            <Head title="Pengujian Efektivitas SMOTE" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                        <h1 className="text-2xl font-semibold">
                            Pengujian Efektivitas SMOTE
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Model Random Forest dilatih dua kali pada data yang sama:
                            pertama menggunakan dataset asli yang tidak seimbang, kedua
                            menggunakan dataset yang telah diseimbangkan dengan SMOTE.
                            Selisih recall kelas minoritas menunjukkan kontribusi SMOTE.
                        </p>
                    </div>
                    <Button onClick={jalankan} disabled={memuat || totalRecords < 10}>
                        {memuat ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            <Play className="mr-2 size-4" />
                        )}
                        {memuat ? 'Menjalankan...' : 'Jalankan Pengujian'}
                    </Button>
                </div>

                {totalRecords < 10 && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Data tidak memadai</AlertTitle>
                        <AlertDescription>
                            Pengujian memerlukan minimal 10 data rekam medis. Saat ini
                            tersedia {totalRecords} data.
                        </AlertDescription>
                    </Alert>
                )}

                {galat && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Pengujian gagal</AlertTitle>
                        <AlertDescription>{galat}</AlertDescription>
                    </Alert>
                )}

                {memuat && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-12">
                            <Loader2 className="size-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">
                                Melatih dua skenario model
                            </p>
                            <p className="max-w-md text-center text-sm text-muted-foreground">
                                Setiap skenario menjalankan grid search dan cross
                                validation. Proses ini memerlukan beberapa menit.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {!hasil && !memuat && !galat && totalRecords >= 10 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-sm text-muted-foreground">
                                Klik Jalankan Pengujian untuk membandingkan performa model
                                pada {totalRecords} data rekam medis.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {hasil && (
                    <>
                        <Alert
                            variant={
                                hasil.selisih_data_uji.recall >= 0
                                    ? 'default'
                                    : 'destructive'
                            }
                        >
                            {hasil.selisih_data_uji.recall >= 0 ? (
                                <TrendingUp className="size-4" />
                            ) : (
                                <TrendingDown className="size-4" />
                            )}
                            <AlertTitle>Kesimpulan Pengujian</AlertTitle>
                            <AlertDescription>{hasil.kesimpulan}</AlertDescription>
                        </Alert>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Perbandingan Hasil Data Uji
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Metrik pada data uji menjadi acuan kesimpulan karena
                                    diukur pada data yang belum pernah dilihat model.
                                    Recall menjadi fokus utama penelitian.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <KepalaPerbandingan />
                                    <TableBody>
                                        {METRIK.map(([kunci, label]) => {
                                            const tanpa =
                                                hasil.no_smote.test_metrics[kunci];
                                            const dengan =
                                                hasil.with_smote.test_metrics[kunci];
                                            const utama = kunci === 'recall';

                                            return (
                                                <TableRow
                                                    key={kunci}
                                                    className={
                                                        utama ? 'bg-primary/5' : undefined
                                                    }
                                                >
                                                    <TableCell className="font-medium">
                                                        {label}
                                                        {utama && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="ml-2"
                                                            >
                                                                Fokus
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatPersen(tanpa)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatPersen(dengan)}
                                                    </TableCell>
                                                    <SelSelisih
                                                        selisih={dengan - tanpa}
                                                    />
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow className="border-t-2">
                                            <TableCell className="font-medium">
                                                Pasien gagal tidak terdeteksi
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    False Negative
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {
                                                    hasil.no_smote.confusion_matrix
                                                        .false_negative
                                                }
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {
                                                    hasil.with_smote.confusion_matrix
                                                        .false_negative
                                                }
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {(() => {
                                                    const beda =
                                                        hasil.with_smote
                                                            .confusion_matrix
                                                            .false_negative -
                                                        hasil.no_smote.confusion_matrix
                                                            .false_negative;
                                                    const warna =
                                                        beda < 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : beda > 0
                                                              ? 'text-red-600 dark:text-red-400'
                                                              : 'text-muted-foreground';
                                                    return (
                                                        <span className={warna}>
                                                            {beda > 0 ? '+' : ''}
                                                            {beda}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Perbandingan Hasil Cross Validation
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Validasi silang lima lipatan pada data latih,
                                    disajikan sebagai pelengkap untuk menilai kestabilan
                                    performa. Nilainya dapat berbeda arah dengan data uji
                                    karena dataset penelitian berukuran kecil.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <KepalaPerbandingan />
                                    <TableBody>
                                        {METRIK.map(([kunci, label, kunciCv]) => {
                                            const tanpa =
                                                hasil.no_smote.cv_results[kunciCv].mean;
                                            const dengan =
                                                hasil.with_smote.cv_results[kunciCv].mean;

                                            return (
                                                <TableRow key={kunci}>
                                                    <TableCell className="font-medium">
                                                        {label}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatPersen(tanpa)}
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            ±
                                                            {formatAngka(
                                                                hasil.no_smote.cv_results[
                                                                    kunciCv
                                                                ].std,
                                                                3,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {formatPersen(dengan)}
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            ±
                                                            {formatAngka(
                                                                hasil.with_smote
                                                                    .cv_results[kunciCv]
                                                                    .std,
                                                                3,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <SelSelisih
                                                        selisih={dengan - tanpa}
                                                    />
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Distribusi Data Latih
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                {(
                                    [
                                        ['Tanpa SMOTE', hasil.no_smote],
                                        ['Dengan SMOTE', hasil.with_smote],
                                    ] as const
                                ).map(([label, skenario]) => {
                                    const dist =
                                        skenario.class_distribution
                                            .latih_setelah_smote ??
                                        skenario.class_distribution.latih_sebelum_smote;

                                    return (
                                        <div
                                            key={label}
                                            className="rounded-lg border p-4"
                                        >
                                            <p className="text-sm font-medium">{label}</p>
                                            <dl className="mt-2 space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <dt className="text-muted-foreground">
                                                        Berhasil
                                                    </dt>
                                                    <dd className="tabular-nums">
                                                        {dist['0'] ?? 0}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-muted-foreground">
                                                        Tidak Berhasil
                                                    </dt>
                                                    <dd className="tabular-nums">
                                                        {dist['1'] ?? 0}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between border-t pt-1">
                                                    <dt className="text-muted-foreground">
                                                        Total data latih
                                                    </dt>
                                                    <dd className="font-medium tabular-nums">
                                                        {skenario.split_info.train_size}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {(
                                [
                                    ['Tanpa SMOTE', hasil.no_smote],
                                    ['Dengan SMOTE', hasil.with_smote],
                                ] as const
                            ).map(([label, skenario]) => (
                                <div key={label} className="space-y-4">
                                    <h2 className="text-lg font-medium">{label}</h2>
                                    <MetricCards
                                        metrics={skenario.test_metrics}
                                        highlightRecall={false}
                                    />
                                    <ConfusionMatrixView
                                        cm={skenario.confusion_matrix}
                                        title={`Confusion Matrix — ${label}`}
                                    />
                                </div>
                            ))}
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Keterangan Pengujian
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-2 text-sm">
                                    {[
                                        ['Model', hasil.model],
                                        [
                                            'Data pada basis data',
                                            `${hasil.data_count} baris`,
                                        ],
                                        [
                                            'Data setelah pembersihan',
                                            `${hasil.cleaned_data_count} baris`,
                                        ],
                                        [
                                            'Proporsi pembagian',
                                            hasil.no_smote.split_info.ratio,
                                        ],
                                    ].map(([label, nilai]) => (
                                        <div
                                            key={label}
                                            className="flex justify-between border-b pb-1.5"
                                        >
                                            <dt className="text-muted-foreground">
                                                {label}
                                            </dt>
                                            <dd className="font-medium">{nilai}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
