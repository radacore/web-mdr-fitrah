import { Card, CardContent, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { cn } from '@/lib/utils';
import { formatPersen } from '@/lib/variabel';
import { ConfusionMatrix, FeatureImportance, Metrics } from '@/types';

/** Penjelasan setiap metrik evaluasi beserta persamaannya. */
const KETERANGAN_METRIK = {
    accuracy: {
        label: 'Accuracy',
        rumus: '(TP + TN) / (TP + TN + FP + FN)',
        arti: 'Ketepatan klasifikasi secara keseluruhan',
    },
    precision: {
        label: 'Precision',
        rumus: 'TP / (TP + FP)',
        arti: 'Ketepatan prediksi pada kelas Tidak Berhasil',
    },
    recall: {
        label: 'Recall',
        rumus: 'TP / (TP + FN)',
        arti: 'Kemampuan mendeteksi seluruh pasien yang gagal pengobatan',
    },
    f1_score: {
        label: 'F1-Score',
        rumus: '2 x (Precision x Recall) / (Precision + Recall)',
        arti: 'Keseimbangan antara precision dan recall',
    },
} as const;

interface MetricCardsProps {
    metrics: Metrics;
    /** Recall ditandai sebagai fokus utama evaluasi penelitian */
    highlightRecall?: boolean;
}

export function MetricCards({ metrics, highlightRecall = true }: MetricCardsProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(KETERANGAN_METRIK) as Array<keyof typeof KETERANGAN_METRIK>).map(
                (kunci) => {
                    const info = KETERANGAN_METRIK[kunci];
                    const utama = highlightRecall && kunci === 'recall';

                    return (
                        <Card
                            key={kunci}
                            className={cn(utama && 'border-primary ring-1 ring-primary/20')}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-sm font-medium">
                                    {info.label}
                                    {utama && (
                                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                            Fokus
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold tabular-nums">
                                    {formatPersen(metrics[kunci])}
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                    {info.rumus}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {info.arti}
                                </p>
                            </CardContent>
                        </Card>
                    );
                },
            )}
        </div>
    );
}

interface ConfusionMatrixViewProps {
    cm: ConfusionMatrix;
    title?: string;
}

/**
 * Confusion matrix dengan kelas positif "Tidak Berhasil" (kelas minoritas).
 * False Negative ditandai karena merupakan kesalahan paling dihindari.
 */
export function ConfusionMatrixView({
    cm,
    title = 'Confusion Matrix',
}: ConfusionMatrixViewProps) {
    const total =
        cm.true_positive + cm.true_negative + cm.false_positive + cm.false_negative;

    const sel = [
        {
            nilai: cm.true_negative,
            singkatan: 'TN',
            nama: 'True Negative',
            arti: 'Diprediksi berhasil, kenyataannya berhasil',
            gaya: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100',
        },
        {
            nilai: cm.false_positive,
            singkatan: 'FP',
            nama: 'False Positive',
            arti: 'Diprediksi gagal, kenyataannya berhasil',
            gaya: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100',
        },
        {
            nilai: cm.false_negative,
            singkatan: 'FN',
            nama: 'False Negative',
            arti: 'Diprediksi berhasil, kenyataannya gagal',
            gaya: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100',
            kritis: true,
        },
        {
            nilai: cm.true_positive,
            singkatan: 'TP',
            nama: 'True Positive',
            arti: 'Diprediksi gagal, kenyataannya gagal',
            gaya: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100',
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Kelas positif adalah pasien dengan status Tidak Berhasil,
                    sehingga False Negative merupakan kesalahan yang paling dihindari.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {sel.map((item) => (
                        <div
                            key={item.singkatan}
                            className={cn('rounded-lg border p-4', item.gaya)}
                        >
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-bold tabular-nums">
                                    {item.nilai}
                                </span>
                                <span className="text-xs font-semibold">
                                    {item.singkatan}
                                </span>
                            </div>
                            <p className="mt-1 text-sm font-medium">{item.nama}</p>
                            <p className="mt-0.5 text-xs opacity-80">{item.arti}</p>
                            {item.kritis && item.nilai > 0 && (
                                <p className="mt-2 text-xs font-semibold">
                                    {item.nilai} pasien berisiko gagal tidak terdeteksi
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Total data uji: {total} sampel
                </p>
            </CardContent>
        </Card>
    );
}

interface FeatureImportanceListProps {
    items: FeatureImportance[];
    title?: string;
    limit?: number;
    labelMap?: Record<string, string>;
}

/**
 * Feature importance Random Forest, diperoleh dari rata-rata penurunan
 * impurity setiap variabel pada seluruh pohon dalam hutan.
 */
export function FeatureImportanceList({
    items,
    title = 'Feature Importance',
    limit,
    labelMap = {},
}: FeatureImportanceListProps) {
    if (!items?.length) return null;

    const tampil = limit ? items.slice(0, limit) : items;
    const maksimum = Math.max(...tampil.map((d) => d.importance), 0.0001);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Kontribusi setiap variabel terhadap keputusan klasifikasi,
                    dihitung dari rata-rata penurunan impurity pada seluruh pohon.
                </p>
            </CardHeader>
            <CardContent>
                <ol className="space-y-2.5">
                    {tampil.map((item, index) => (
                        <li key={item.feature} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                                <span className="flex min-w-0 items-baseline gap-2">
                                    <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                        {index + 1}.
                                    </span>
                                    <span className="truncate">
                                        {labelMap[item.feature] ?? item.feature}
                                    </span>
                                </span>
                                <span className="shrink-0 font-medium tabular-nums">
                                    {(item.importance * 100).toFixed(2)}%
                                </span>
                            </div>
                            <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{
                                        width: `${(item.importance / maksimum) * 100}%`,
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}
