import AppLayout from '@/Layouts/AppLayout';
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
import { useMlProcess } from '@/hooks/use-ml-process';
import { formatPersen } from '@/lib/variabel';
import { ConfusionMatrix, Metrics } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertCircle, Loader2, Play } from 'lucide-react';

interface HasilProporsi {
    ratio: string;
    train_size: number;
    test_size: number;
    test_metrics: Metrics;
    train_metrics: Metrics | null;
    confusion_matrix: ConfusionMatrix;
    cv_f1: number;
    best_params: Record<string, string | number | null>;
}

interface HasilPohon {
    n_estimators: number;
    test_metrics: Metrics;
    train_metrics: Metrics;
    confusion_matrix: ConfusionMatrix;
}

interface Hasil {
    model: string;
    data_count: number;
    cleaned_data_count: number;
    variasi_proporsi: HasilProporsi[];
    variasi_n_estimators: HasilPohon[];
    proporsi_terbaik: string;
    n_estimators_terbaik: number;
    error?: string;
}

const METRIK = [
    ['accuracy', 'Accuracy'],
    ['precision', 'Precision'],
    ['recall', 'Recall'],
    ['f1_score', 'F1-Score'],
] as const;

export default function TestScenarios({ totalRecords }: { totalRecords: number }) {
    const { data: hasil, memuat, galat, jalankan } =
        useMlProcess<Hasil>('/api/test-scenarios');

    return (
        <AppLayout breadcrumbs={[{ label: 'Skenario Pengujian' }]}>
            <Head title="Skenario Pengujian" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                        <h1 className="text-2xl font-semibold">Skenario Pengujian</h1>
                        <p className="text-sm text-muted-foreground">
                            Pengujian variasi proporsi pembagian data untuk menilai
                            stabilitas performa model, serta variasi jumlah pohon untuk
                            menemukan konfigurasi terbaik sekaligus menghindari overfitting.
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
                                Melatih beberapa konfigurasi model
                            </p>
                            <p className="max-w-md text-center text-sm text-muted-foreground">
                                Pengujian melatih model pada dua proporsi pembagian data
                                dan lima variasi jumlah pohon. Proses ini memerlukan
                                beberapa menit.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {!hasil && !memuat && !galat && totalRecords >= 10 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-sm text-muted-foreground">
                                Klik Jalankan Pengujian untuk memulai pengujian pada{' '}
                                {totalRecords} data rekam medis.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {hasil && (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Proporsi Pembagian Terbaik
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">
                                        {hasil.proporsi_terbaik}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Berdasarkan F1-score pada data uji
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Jumlah Pohon Terbaik
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold tabular-nums">
                                        {hasil.n_estimators_terbaik}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Berdasarkan F1-score pada data uji
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Skenario 1: Variasi Proporsi Pembagian Data
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Performa yang konsisten pada kedua proporsi menandakan
                                    model stabil terhadap perubahan pembagian data.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Proporsi</TableHead>
                                                <TableHead className="text-right">
                                                    Data Latih
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Data Uji
                                                </TableHead>
                                                {METRIK.map(([kunci, label]) => (
                                                    <TableHead
                                                        key={kunci}
                                                        className="text-right"
                                                    >
                                                        {label}
                                                    </TableHead>
                                                ))}
                                                <TableHead className="text-right">
                                                    F1 CV
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {hasil.variasi_proporsi.map((baris) => (
                                                <TableRow
                                                    key={baris.ratio}
                                                    className={
                                                        baris.ratio ===
                                                        hasil.proporsi_terbaik
                                                            ? 'bg-primary/5'
                                                            : undefined
                                                    }
                                                >
                                                    <TableCell className="font-medium">
                                                        {baris.ratio}
                                                        {baris.ratio ===
                                                            hasil.proporsi_terbaik && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="ml-2"
                                                            >
                                                                Terbaik
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {baris.train_size}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {baris.test_size}
                                                    </TableCell>
                                                    {METRIK.map(([kunci]) => (
                                                        <TableCell
                                                            key={kunci}
                                                            className="text-right tabular-nums"
                                                        >
                                                            {formatPersen(
                                                                baris.test_metrics[kunci],
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                                        {formatPersen(baris.cv_f1)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Skenario 2: Variasi Jumlah Pohon (n_estimators)
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Diuji pada pembagian 80:20 dengan data latih yang telah
                                    diseimbangkan SMOTE. Kolom selisih menunjukkan
                                    indikasi overfitting.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>n_estimators</TableHead>
                                                {METRIK.map(([kunci, label]) => (
                                                    <TableHead
                                                        key={kunci}
                                                        className="text-right"
                                                    >
                                                        {label}
                                                    </TableHead>
                                                ))}
                                                <TableHead className="text-right">
                                                    Selisih F1 Latih–Uji
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {hasil.variasi_n_estimators.map((baris) => {
                                                const selisih =
                                                    baris.train_metrics.f1_score -
                                                    baris.test_metrics.f1_score;

                                                return (
                                                    <TableRow
                                                        key={baris.n_estimators}
                                                        className={
                                                            baris.n_estimators ===
                                                            hasil.n_estimators_terbaik
                                                                ? 'bg-primary/5'
                                                                : undefined
                                                        }
                                                    >
                                                        <TableCell className="font-medium tabular-nums">
                                                            {baris.n_estimators}
                                                            {baris.n_estimators ===
                                                                hasil.n_estimators_terbaik && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="ml-2"
                                                                >
                                                                    Terbaik
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        {METRIK.map(([kunci]) => (
                                                            <TableCell
                                                                key={kunci}
                                                                className="text-right tabular-nums"
                                                            >
                                                                {formatPersen(
                                                                    baris.test_metrics[
                                                                        kunci
                                                                    ],
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell
                                                            className={`text-right tabular-nums ${
                                                                selisih > 0.15
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {selisih >= 0 ? '+' : ''}
                                                            {formatPersen(selisih)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

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
