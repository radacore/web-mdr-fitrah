import AppLayout from '@/Layouts/AppLayout';
import {
    ConfusionMatrixView,
    FeatureImportanceList,
    MetricCards,
} from '@/ShadcnComponents/EvaluationDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
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
import { LABEL_FITUR_ML, formatAngka, formatPersen } from '@/lib/variabel';
import {
    ClassDistribution,
    ConfusionMatrix,
    CvResults,
    FeatureImportance,
    Metrics,
} from '@/types';
import { Head } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';

interface Statistics {
    model: string;
    metrics: Metrics;
    train_metrics: Metrics | null;
    confusion_matrix: ConfusionMatrix;
    classification_report: string;
    cv_results: CvResults;
    best_params: Record<string, string | number | null>;
    best_cv_score: number;
    feature_importance: FeatureImportance[];
    class_distribution: ClassDistribution;
    split_info: {
        ratio: string;
        total: number;
        train_size: number;
        test_size_count: number;
        train_size_before_smote?: number;
    };
    smote_info: {
        applied: boolean;
        class_distribution: {
            latih_sebelum_smote: Record<string, number>;
            latih_setelah_smote: Record<string, number> | null;
        };
    } | null;
    cleaning_report: {
        total_awal: number;
        dibuang_duplikat: number;
        dibuang_missing: number;
        total_akhir: number;
    } | null;
}

interface Props {
    statistics: Statistics | null;
    error: string | null;
    databaseDistribution: {
        Berhasil: number;
        'Tidak Berhasil': number;
        total: number;
    };
}

const LABEL_PARAMETER: Record<string, string> = {
    n_estimators: 'Jumlah pohon (n_estimators)',
    max_depth: 'Kedalaman maksimum (max_depth)',
    min_samples_split: 'Minimum sampel pemisah (min_samples_split)',
    random_state: 'Nilai acak (random_state)',
};

const LABEL_CV: Record<keyof CvResults, string> = {
    accuracy: 'Accuracy',
    precision: 'Precision',
    recall: 'Recall',
    f1: 'F1-Score',
};

export default function Statistics({ statistics, error, databaseDistribution }: Props) {
    if (!statistics) {
        return (
            <AppLayout breadcrumbs={[{ label: 'Evaluasi Model' }]}>
                <Head title="Evaluasi Model" />
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Data evaluasi tidak tersedia</AlertTitle>
                    <AlertDescription>
                        {error ??
                            'Model belum dilatih. Lakukan pelatihan model terlebih dahulu.'}
                    </AlertDescription>
                </Alert>
            </AppLayout>
        );
    }

    const { metrics, train_metrics, cv_results, split_info, smote_info } = statistics;
    const sebelumSmote = smote_info?.class_distribution?.latih_sebelum_smote;
    const setelahSmote = smote_info?.class_distribution?.latih_setelah_smote;

    return (
        <AppLayout breadcrumbs={[{ label: 'Evaluasi Model' }]}>
            <Head title="Evaluasi Model" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Evaluasi Model</h1>
                        <p className="text-sm text-muted-foreground">
                            Hasil evaluasi model {statistics.model} pada data uji beserta
                            kontribusi setiap variabel.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="default">{statistics.model}</Badge>
                        {smote_info?.applied && <Badge variant="secondary">SMOTE</Badge>}
                        <Badge variant="outline">
                            Pembagian {split_info.ratio}
                        </Badge>
                    </div>
                </div>

                <section className="space-y-3">
                    <h2 className="text-lg font-medium">Metrik Evaluasi Data Uji</h2>
                    <MetricCards metrics={metrics} />
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <ConfusionMatrixView cm={statistics.confusion_matrix} />

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Distribusi Kelas
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Rasio ketidakseimbangan{' '}
                                    {statistics.class_distribution.rasio_ketidakseimbangan}
                                    :1 dengan kelas minoritas{' '}
                                    {statistics.class_distribution.kelas_minoritas}.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(
                                    [
                                        [
                                            'Berhasil',
                                            statistics.class_distribution.Berhasil,
                                            statistics.class_distribution.persen_berhasil,
                                            'bg-emerald-500',
                                        ],
                                        [
                                            'Tidak Berhasil',
                                            statistics.class_distribution[
                                                'Tidak Berhasil'
                                            ],
                                            statistics.class_distribution
                                                .persen_tidak_berhasil,
                                            'bg-red-500',
                                        ],
                                    ] as const
                                ).map(([label, jumlah, persen, warna]) => (
                                    <div key={label} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span>{label}</span>
                                            <span className="font-medium tabular-nums">
                                                {jumlah} ({persen}%)
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${warna}`}
                                                style={{ width: `${persen}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {sebelumSmote && setelahSmote && (
                                    <div className="rounded-md border bg-muted/40 p-3">
                                        <p className="text-sm font-medium">
                                            Penyeimbangan Data Latih dengan SMOTE
                                        </p>
                                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Sebelum
                                                </p>
                                                <p className="tabular-nums">
                                                    Berhasil {sebelumSmote['0'] ?? 0} ·
                                                    Tidak Berhasil{' '}
                                                    {sebelumSmote['1'] ?? 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Sesudah
                                                </p>
                                                <p className="tabular-nums">
                                                    Berhasil {setelahSmote['0'] ?? 0} ·
                                                    Tidak Berhasil{' '}
                                                    {setelahSmote['1'] ?? 0}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            SMOTE diterapkan hanya pada data latih untuk
                                            mencegah kebocoran data.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Pembagian dan Kualitas Data
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-2 text-sm">
                                    {[
                                        [
                                            'Data pada basis data',
                                            `${databaseDistribution.total} baris`,
                                        ],
                                        statistics.cleaning_report && [
                                            'Data setelah pembersihan',
                                            `${statistics.cleaning_report.total_akhir} baris`,
                                        ],
                                        statistics.cleaning_report && [
                                            'Dibuang karena duplikat',
                                            `${statistics.cleaning_report.dibuang_duplikat} baris`,
                                        ],
                                        statistics.cleaning_report && [
                                            'Dibuang karena nilai hilang',
                                            `${statistics.cleaning_report.dibuang_missing} baris`,
                                        ],
                                        [
                                            'Data latih',
                                            `${split_info.train_size} sampel`,
                                        ],
                                        [
                                            'Data uji',
                                            `${split_info.test_size_count} sampel`,
                                        ],
                                    ]
                                        .filter(Boolean)
                                        .map((baris) => {
                                            const [label, nilai] = baris as [
                                                string,
                                                string,
                                            ];
                                            return (
                                                <div
                                                    key={label}
                                                    className="flex justify-between border-b pb-1.5"
                                                >
                                                    <dt className="text-muted-foreground">
                                                        {label}
                                                    </dt>
                                                    <dd className="font-medium tabular-nums">
                                                        {nilai}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Hasil K-Fold Cross Validation
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Validasi 5-fold pada data latih untuk memperoleh estimasi
                                performa yang lebih stabil.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metrik</TableHead>
                                        <TableHead className="text-right">
                                            Rata-rata
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Simpangan Baku
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(
                                        Object.keys(LABEL_CV) as Array<keyof CvResults>
                                    ).map((kunci) => (
                                        <TableRow key={kunci}>
                                            <TableCell className="font-medium">
                                                {LABEL_CV[kunci]}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatPersen(cv_results[kunci].mean)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                ±{formatAngka(cv_results[kunci].std)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Hyperparameter Terpilih
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Kombinasi terbaik hasil grid search berdasarkan F1-score
                                cross validation ({formatPersen(statistics.best_cv_score)}).
                            </p>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-2 text-sm">
                                {Object.entries(statistics.best_params).map(
                                    ([kunci, nilai]) => (
                                        <div
                                            key={kunci}
                                            className="flex justify-between border-b pb-1.5"
                                        >
                                            <dt className="text-muted-foreground">
                                                {LABEL_PARAMETER[kunci] ?? kunci}
                                            </dt>
                                            <dd className="font-mono font-medium">
                                                {nilai === null ? 'None' : String(nilai)}
                                            </dd>
                                        </div>
                                    ),
                                )}
                            </dl>
                        </CardContent>
                    </Card>
                </div>

                {train_metrics && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Perbandingan Data Latih dan Data Uji
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Selisih yang terlalu besar menandakan model mengalami
                                overfitting.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metrik</TableHead>
                                        <TableHead className="text-right">
                                            Data Latih
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Data Uji
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Selisih
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(
                                        [
                                            ['accuracy', 'Accuracy'],
                                            ['precision', 'Precision'],
                                            ['recall', 'Recall'],
                                            ['f1_score', 'F1-Score'],
                                        ] as const
                                    ).map(([kunci, label]) => {
                                        const selisih =
                                            train_metrics[kunci] - metrics[kunci];

                                        return (
                                            <TableRow key={kunci}>
                                                <TableCell className="font-medium">
                                                    {label}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatPersen(train_metrics[kunci])}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatPersen(metrics[kunci])}
                                                </TableCell>
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
                        </CardContent>
                    </Card>
                )}

                <FeatureImportanceList
                    items={statistics.feature_importance}
                    title="Feature Importance Random Forest"
                    labelMap={LABEL_FITUR_ML}
                />

                {statistics.classification_report && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Laporan Klasifikasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
                                {statistics.classification_report}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
