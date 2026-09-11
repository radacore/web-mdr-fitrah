import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ShadcnComponents/ui/table';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { useMemo } from 'react';

interface ModelMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
}

interface ConfusionMatrix {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
}

interface EvaluationResult {
    metrics: ModelMetrics;
    confusion_matrix: ConfusionMatrix;
    confusion_matrix_array: number[][];
}

interface CVResult {
    accuracy: { mean: number; std: number };
    precision: { mean: number; std: number };
    recall: { mean: number; std: number };
    f1: { mean: number; std: number };
}

interface ComparisonEntry {
    accuracy: { train: number; test: number };
    sensitivity: { train: number; test: number };
    specificity: { train: number; test: number };
    auc_roc: { train: number; test: number };
}

interface BestParamsEntry {
    params: Record<string, any>;
    best_cv_score: number;
}

interface BootstrapCI {
    mean: number;
    ci_lower: number;
    ci_upper: number;
}

interface CurveData {
    roc: { fpr: number[]; tpr: number[]; auc: number };
    pr: { precision: number[]; recall: number[]; average_precision: number };
    calibration: { prob_true: number[]; prob_pred: number[]; brier_score: number };
}

interface OddsRatioEntry {
    feature: string;
    coefficient: number;
    odds_ratio: number;
    ci_lower: number;
    ci_upper: number;
    p_value: number;
    significant: boolean;
}

interface FeatureImportanceEntry {
    feature: string;
    importance: number;
}

interface PermutationImportanceEntry {
    feature: string;
    importance_mean: number;
    importance_std: number;
}

interface ShapEntry {
    feature: string;
    shap_mean_abs: number;
}

interface ShapData {
    method: 'linear' | 'tree_proxy' | 'permutation_fallback' | 'kernel_exact' | 'error';
    features: ShapEntry[];
    values?: number[][] | null;
    detail?: string;
    background?: string | null;
    base_value?: number | null;
}

interface InterpretabilityData {
    odds_ratios?: OddsRatioEntry[];
    feature_importance?: FeatureImportanceEntry[];
    permutation_importance?: PermutationImportanceEntry[];
    shap?: ShapData;
}

interface ExternalValidationData {
    status?: string;
    cohort?: {
        period?: string;
        site?: string;
        source_register?: string;
        sample_size?: number;
        success?: number;
        failure?: number;
        missing_outcome?: number;
        inclusion_criteria?: string;
        exclusion_criteria?: string;
        missing_profile?: Record<string, number> | null;
        features?: string[];
    };
    table6?: {
        rows?: Array<{
            metric: string;
            internal_test?: number;
            external_test?: number;
        }>;
        internal?: Record<string, number> | null;
        external?: Record<string, number> | null;
    } | null;
    external_roc?: { fpr: number[]; tpr: number[]; thresholds?: number[]; auc: number | null } | null;
    split?: Record<string, number> | null;
    external_metrics?: Record<string, any> | null;
}

interface DCACurve {
    thresholds: number[];
    net_benefit_model: number[];
    net_benefit_all: number[];
    net_benefit_none: number[];
    prevalence: number;
    n: number;
}

interface DcaData {
    status?: string;
    curve?: DCACurve | null;
    contributions?: Array<{ feature: string; contribution: number }> | null;
    note?: string | null;
}

interface Statistics {
    evaluation_results: Record<string, EvaluationResult>;
    best_model: string;
    cv_results: Record<string, CVResult>;
    comparison_table: Record<string, ComparisonEntry> | null;
    best_params: Record<string, BestParamsEntry> | null;
    class_distribution?: {
        counts?: Record<string, number>;
        percentages?: Record<string, number>;
        total?: number;
        imbalance_ratio?: number;
        original?: Record<string, number>;
        train?: Record<string, number>;
    } | null;
    raw_class_distribution?: {
        counts: Record<string, number>;
        total: number;
    } | null;
    bootstrap_ci?: Record<string, Record<string, BootstrapCI>> | null;
}

interface Props {
    statistics: Statistics | null;
    curves: Record<string, CurveData> | null;
    interpretability: Record<string, InterpretabilityData> | null;
    externalValidation?: ExternalValidationData | null;
    dca?: DcaData | null;
    error: string | null;
}

const MODEL_COLORS: Record<string, string> = {
    'Logistic Regression': '#8b5cf6',
    'Decision Tree': '#f59e0b',
    'Support Vector Machine': '#10b981',
};

const getModelColor = (name: string, idx: number) =>
    MODEL_COLORS[name] || ['#6366f1', '#ec4899', '#14b8a6'][idx % 3];

export default function Statistics({ statistics, curves, interpretability, externalValidation, dca, error }: Props) {
    if (error || !statistics) {
        return (
            <AppLayout breadcrumbs={[{ label: 'Statistik' }]}>
                <Head title="Statistik Model" />
                <div className="space-y-6">
                    <Alert variant="destructive">
                        <AlertDescription>
                            {error || 'Tidak dapat memuat statistik. Pastikan ML Service berjalan.'}
                        </AlertDescription>
                    </Alert>
                    <div className="mt-4 text-center">
                        <Button asChild>
                            <Link href={route('prediction.index')}>Kembali ke Prediksi</Link>
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const modelNames = Object.keys(statistics.evaluation_results);

    // Dynamic model analysis data
    const modelDescriptions: Record<string, { strengths: string[]; why: string }> = {
        'Logistic Regression': {
            strengths: [
                'Efektif untuk klasifikasi biner seperti prediksi MDR-TB (Berhasil/Tidak Berhasil)',
                'Regularisasi (parameter C) mencegah overfitting, sangat penting untuk dataset berukuran kecil',
                'Memberikan output probabilitas yang terukur dan dapat diinterpretasi secara klinis',
                'Robust terhadap fitur kategorikal biner yang mendominasi dataset ini',
            ],
            why: 'Logistic Regression unggul karena kemampuannya menangani klasifikasi biner dengan regularisasi yang mencegah overfitting pada dataset kecil. Model ini memberikan probabilitas yang akurat dan mudah diinterpretasi secara klinis.'
        },
        'Decision Tree': {
            strengths: [
                'Mudah diinterpretasi karena menghasilkan aturan keputusan yang jelas (if-then)',
                'Tidak membutuhkan normalisasi data dan dapat menangani fitur kategorikal secara langsung',
                'Mampu menangkap hubungan non-linier antar fitur',
                'Pembatasan kedalaman (max_depth) mencegah overfitting',
            ],
            why: 'Decision Tree unggul karena kemampuannya menangkap pola keputusan yang kompleks dalam data klinis. Aturan keputusan yang dihasilkan mudah dipahami oleh tenaga medis.'
        },
        'Support Vector Machine': {
            strengths: [
                'Efektif pada ruang fitur berdimensi tinggi dengan jumlah sampel terbatas',
                'Margin-based classification memberikan generalisasi yang baik pada data baru',
                'Kernel trick memungkinkan pemisahan data non-linier',
                'Parameter regularisasi (C) mengontrol trade-off antara margin dan error',
            ],
            why: 'Support Vector Machine unggul karena kemampuannya menemukan hyperplane optimal yang memaksimalkan margin pemisahan antar kelas, menghasilkan generalisasi yang baik pada data baru.'
        },
    };

    // Parameter explanations
    const paramExplanations: Record<string, string> = {
        'C': 'Kekuatan regularisasi (nilai kecil = regularisasi kuat, mencegah overfitting)',
        'penalty': 'Tipe regularisasi (L1 = Lasso, L2 = Ridge)',
        'solver': 'Algoritma optimasi untuk mencari koefisien terbaik',
        'max_depth': 'Kedalaman maksimum pohon (membatasi kompleksitas model)',
        'min_samples_split': 'Minimal sampel untuk membagi sebuah node',
        'min_samples_leaf': 'Minimal sampel di setiap daun/leaf node',
        'criterion': 'Metode pengukuran kualitas split (gini = Gini Impurity, entropy = Information Gain)',
        'kernel': 'Fungsi kernel (linear = hyperplane lurus, rbf = non-linier)',
        'gamma': 'Parameter kernel yang mengontrol jangkauan pengaruh tiap sampel',
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Statistik' }]}>
            <Head title="Statistik Model" />

            <div className="space-y-6">
                {/* Best Model Info - Only show if there's more than 1 model */}
                {modelNames.length > 1 && (
                    <Card className="border-2 border-purple-500 overflow-hidden">
                        <CardHeader className="bg-purple-50 dark:bg-purple-950">
                            <CardTitle className="text-center">🏆 Model Terbaik: {statistics.best_model}</CardTitle>
                            <CardDescription className="text-center">
                                Dipilih berdasarkan skor F1 tertinggi dari K-Fold Cross Validation
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {/* Analisis Model Terbaik - Dynamic */}
                {statistics.best_model && statistics.cv_results && (
                    <Card>
                        <CardHeader>
                            <CardTitle>📊 Analisis Pemilihan Model Terbaik</CardTitle>
                            <CardDescription>
                                Alasan ilmiah mengapa <strong>{statistics.best_model}</strong> dipilih sebagai model terbaik
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* CV Score Comparison */}
                            <div>
                                <p className="font-medium mb-2">Perbandingan Skor F1 Cross Validation:</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {Object.entries(statistics.cv_results).map(([name, cv]) => {
                                        const isBest = name === statistics.best_model;
                                        return (
                                            <div
                                                key={name}
                                                className={`p-3 rounded-lg border-2 ${isBest
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                                                    }`}
                                            >
                                                <p className={`text-sm font-medium ${isBest ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                                                    {isBest && '🏆 '}{name}
                                                </p>
                                                <p className={`text-2xl font-bold ${isBest ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                                                    {(cv.f1.mean * 100).toFixed(2)}%
                                                </p>
                                                <p className="text-xs text-muted-foreground">F1-Score (±{(cv.f1.std * 100).toFixed(2)}%)</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scientific Explanation */}
                            {modelDescriptions[statistics.best_model] && (
                                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <p className="font-medium text-green-800 dark:text-green-200 mb-2">Mengapa {statistics.best_model}?</p>
                                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                                        {modelDescriptions[statistics.best_model].why}
                                    </p>
                                    <p className="font-medium text-green-800 dark:text-green-200 mb-2">Keunggulan {statistics.best_model}:</p>
                                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                        {modelDescriptions[statistics.best_model].strengths.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-green-500 mt-0.5">✓</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Best params summary */}
                            {statistics.best_params?.[statistics.best_model] && (
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <p className="font-medium mb-2">Konfigurasi Optimal (dari Hyperparameter Tuning):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(statistics.best_params[statistics.best_model].params).map(([param, value]) => (
                                            <span key={param} className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-900 px-3 py-1 text-sm font-mono text-purple-700 dark:text-purple-300">
                                                {param}={String(value)}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Best CV F1-Score: <strong>{(statistics.best_params[statistics.best_model].best_cv_score * 100).toFixed(2)}%</strong>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Tabel Perbandingan Validasi Internal Training vs Testing */}
                {statistics.comparison_table && Object.keys(statistics.comparison_table).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Tabel Hasil Validasi Internal Kinerja Model Pembelajaran Mesin</CardTitle>
                            <CardDescription>Perbandingan metrik pada data training (Tr) dan data testing (Ts)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead rowSpan={2} className="border font-bold align-middle">Model</TableHead>
                                            <TableHead colSpan={2} className="text-center border font-bold">Akurasi (%)</TableHead>
                                            <TableHead colSpan={2} className="text-center border font-bold">Sensitivitas (%)</TableHead>
                                            <TableHead colSpan={2} className="text-center border font-bold">Spesifisitas (%)</TableHead>
                                            <TableHead colSpan={2} className="text-center border font-bold">AUC-ROC (%)</TableHead>
                                        </TableRow>
                                        <TableRow>
                                            <TableHead className="text-center border text-xs">Tr</TableHead>
                                            <TableHead className="text-center border text-xs">Ts</TableHead>
                                            <TableHead className="text-center border text-xs">Tr</TableHead>
                                            <TableHead className="text-center border text-xs">Ts</TableHead>
                                            <TableHead className="text-center border text-xs">Tr</TableHead>
                                            <TableHead className="text-center border text-xs">Ts</TableHead>
                                            <TableHead className="text-center border text-xs">Tr</TableHead>
                                            <TableHead className="text-center border text-xs">Ts</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(statistics.comparison_table).map(([name, data]) => {
                                            const isBest = modelNames.length > 1 && name === statistics.best_model;
                                            return (
                                                <TableRow key={name} className={isBest ? 'bg-purple-50 dark:bg-purple-950 font-semibold' : ''}>
                                                    <TableCell className="border font-medium italic">
                                                        {isBest && '🏆 '}{name}
                                                    </TableCell>
                                                    <TableCell className="text-center border">{data.accuracy.train.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.accuracy.test.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.sensitivity.train.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.sensitivity.test.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.specificity.train.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.specificity.test.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.auc_roc.train.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center border">{data.auc_roc.test.toFixed(2)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                Keterangan: <strong>Tr</strong> = Data Training; <strong>Ts</strong> = Data Testing
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Tabel Hyperparameter Tuning */}
                {statistics.best_params && Object.keys(statistics.best_params).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Hasil Hyperparameter Tuning (GridSearchCV)</CardTitle>
                            <CardDescription>Parameter terbaik untuk setiap model yang ditemukan melalui Grid Search dengan 5-Fold Cross Validation</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="border font-bold">Model</TableHead>
                                        <TableHead className="border font-bold">Parameter Terbaik</TableHead>
                                        <TableHead className="text-center border font-bold">Best CV F1-Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(statistics.best_params).map(([name, info]) => {
                                        const isBest = modelNames.length > 1 && name === statistics.best_model;
                                        return (
                                            <TableRow key={name} className={isBest ? 'bg-purple-50 dark:bg-purple-950' : ''}>
                                                <TableCell className="border font-medium">
                                                    {isBest && '\ud83c\udfc6 '}{name}
                                                </TableCell>
                                                <TableCell className="border">
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(info.params).map(([param, value]) => (
                                                            <span key={param} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono">
                                                                {param}={String(value)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center border font-semibold">
                                                    {(info.best_cv_score * 100).toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {/* Parameter Explanations */}
                            <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2 text-sm">Keterangan Parameter:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                    {Object.entries(paramExplanations).map(([param, desc]) => (
                                        <p key={param} className="text-xs text-muted-foreground">
                                            <span className="font-mono font-semibold text-foreground">{param}</span> — {desc}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Perbandingan Model - Test Set Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {modelNames.length > 1 ? 'Perbandingan Performa Model (Test Set)' : 'Performa Model (Test Set)'}
                        </CardTitle>
                        <CardDescription>Metrik evaluasi pada 15% data testing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Model</TableHead>
                                    <TableHead className="text-center">Accuracy</TableHead>
                                    <TableHead className="text-center">Precision</TableHead>
                                    <TableHead className="text-center">Recall</TableHead>
                                    <TableHead className="text-center">F1-Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modelNames.map((name) => {
                                    const metrics = statistics.evaluation_results[name].metrics;
                                    const isBest = modelNames.length > 1 && name === statistics.best_model;
                                    return (
                                        <TableRow key={name} className={isBest ? 'bg-purple-50 dark:bg-purple-950' : ''}>
                                            <TableCell className="font-medium">
                                                {isBest && '🏆 '}{name}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(metrics.accuracy * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(metrics.precision * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(metrics.recall * 100).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {(metrics.f1_score * 100).toFixed(2)}%
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* K-Fold Cross Validation Results */}
                {statistics.cv_results && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {modelNames.length > 1 ? 'Hasil K-Fold Cross Validation (K=5)' : 'Performa Cross Validation (K=5)'}
                            </CardTitle>
                            <CardDescription>Rata-rata metrik dari 5-fold cross validation pada 70% data training</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead className="text-center">Accuracy</TableHead>
                                        <TableHead className="text-center">Precision</TableHead>
                                        <TableHead className="text-center">Recall</TableHead>
                                        <TableHead className="text-center">F1-Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(statistics.cv_results).map(([name, cv]) => {
                                        const isBest = name === statistics.best_model;
                                        return (
                                            <TableRow key={name} className={isBest ? 'bg-purple-50 dark:bg-purple-950' : ''}>
                                                <TableCell className="font-medium">
                                                    {isBest && '🏆 '}{name}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(cv.accuracy.mean * 100).toFixed(2)}% ± {(cv.accuracy.std * 100).toFixed(2)}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(cv.precision.mean * 100).toFixed(2)}% ± {(cv.precision.std * 100).toFixed(2)}%
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {(cv.recall.mean * 100).toFixed(2)}% ± {(cv.recall.std * 100).toFixed(2)}%
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {(cv.f1.mean * 100).toFixed(2)}% ± {(cv.f1.std * 100).toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Confusion Matrices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modelNames.map((name) => {
                        const cm = statistics.evaluation_results[name].confusion_matrix;
                        const isBest = name === statistics.best_model;
                        return (
                            <Card key={name} className={isBest ? 'border-2 border-purple-500' : ''}>
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {isBest && '🏆 '}Confusion Matrix: {name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div></div>
                                        <div className="font-semibold text-green-600">Pred: Berhasil</div>
                                        <div className="font-semibold text-red-600">Pred: Tidak</div>

                                        <div className="font-semibold text-green-600">Actual: Berhasil</div>
                                        <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                                            TP: {cm.true_positive}
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900 p-2 rounded">
                                            FN: {cm.false_negative}
                                        </div>

                                        <div className="font-semibold text-red-600">Actual: Tidak</div>
                                        <div className="bg-red-100 dark:bg-red-900 p-2 rounded">
                                            FP: {cm.false_positive}
                                        </div>
                                        <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                                            TN: {cm.true_negative}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Class Distribution */}
                {statistics.class_distribution && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribusi Kelas Target</CardTitle>
                            <CardDescription>
                                Distribusi label Keberhasilan Pengobatan pada dataset.
                                Ditampilkan dua versi: data mentah dari database dan
                                data bersih yang dipakai melatih model.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const labelMap: Record<string, string> = { '0': 'Berhasil', '1': 'Tidak Berhasil' };
                                const pieColors = ['#10b981', '#ef4444'];

                                const cleanCounts = statistics.class_distribution?.counts
                                    || statistics.class_distribution?.original
                                    || {};
                                const rawCounts = statistics.raw_class_distribution?.counts || {};
                                const rawTotal = statistics.raw_class_distribution?.total
                                    ?? Object.values(rawCounts).reduce((a, b) => a + b, 0);
                                const cleanTotal = Object.values(cleanCounts).reduce((a, b) => a + b, 0);

                                const renderPie = (
                                    title: string,
                                    subtitle: string,
                                    counts: Record<string, number>,
                                    total: number,
                                ) => {
                                    const pieData = Object.entries(counts).map(([k, v]) => ({
                                        name: labelMap[k] || k,
                                        value: v,
                                    }));
                                    return (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="mb-2">
                                                <h4 className="text-sm font-semibold">{title}</h4>
                                                <p className="text-xs text-muted-foreground">{subtitle}</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                                <div className="flex items-center justify-center">
                                                    {pieData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={220}>
                                                            <PieChart>
                                                                <Pie
                                                                    data={pieData}
                                                                    dataKey="value"
                                                                    nameKey="name"
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={80}
                                                                    labelLine={false}
                                                                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                                                                >
                                                                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                                                                </Pie>
                                                                <Tooltip formatter={(value, name) => {
                                                                    const v = typeof value === 'number' ? value : 0;
                                                                    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                                                                    return [`${v} (${pct}%)`, name as string];
                                                                }} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Data tidak tersedia.</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col justify-center space-y-2">
                                                    {pieData.map((d, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                                                            <span className="font-medium">{d.name}:</span>
                                                            <span>{d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)</span>
                                                        </div>
                                                    ))}
                                                    <p className="text-sm text-muted-foreground mt-2">Total: {total} data</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                const dropped = rawTotal && cleanTotal ? rawTotal - cleanTotal : 0;
                                const droppedPct = rawTotal > 0 ? ((dropped / rawTotal) * 100).toFixed(1) : '0';

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {rawTotal > 0 && renderPie(
                                                'Data Mentah (dari database)',
                                                'Sebelum pembersihan, seluruh baris di tabel training_data.',
                                                rawCounts,
                                                rawTotal,
                                            )}
                                            {renderPie(
                                                'Data Bersih (dipakai melatih model)',
                                                'Setelah drop missing value, feature engineering IMT, dan outlier IQR.',
                                                cleanCounts,
                                                cleanTotal,
                                            )}
                                        </div>

                                        <Alert>
                                            <AlertDescription>
                                                <p className="mb-2">
                                                    <span className="font-semibold">Mengapa angka kanan dan kiri berbeda?</span>{' '}
                                                    Saat pelatihan model, ML service melakukan langkah-langkah pembersihan
                                                    sebelum melakukan split 70/15/15 dan SMOTE:
                                                </p>
                                                <ol className="list-decimal pl-5 space-y-1 text-sm">
                                                    <li>Drop baris yang memiliki <em>missing value</em> pada fitur atau target.</li>
                                                    <li>Hitung IMT dari BB dan TB (<em>feature engineering</em>).</li>
                                                    <li>Buang <em>outlier</em> dengan metode IQR pada fitur numerik (BB, TB, IMT, Usia).</li>
                                                    <li>Lakukan <em>label encoding</em> untuk fitur kategorikal.</li>
                                                </ol>
                                                {rawTotal > 0 && cleanTotal > 0 && (
                                                    <p className="mt-2 text-sm">
                                                        Pada dataset saat ini, dari <strong>{rawTotal}</strong> baris mentah
                                                        tersisa <strong>{cleanTotal}</strong> baris bersih
                                                        ({dropped} baris dibuang, sekitar {droppedPct}%). Semua metrik
                                                        model di halaman ini dihitung dari {cleanTotal} baris bersih tersebut.
                                                    </p>
                                                )}
                                                {statistics.class_distribution?.imbalance_ratio && (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Imbalance Ratio (data bersih): {statistics.class_distribution.imbalance_ratio}:1
                                                    </p>
                                                )}
                                            </AlertDescription>
                                        </Alert>

                                        <Alert className="border-blue-200 bg-blue-50/40">
                                            <AlertDescription>
                                                <p className="mb-1 font-semibold text-foreground">
                                                    Fairness perbandingan model
                                                </p>
                                                <p className="text-sm">
                                                    Semua model (Logistic Regression,
                                                    Decision Tree, SVM) di halaman ini
                                                    dilatih dengan konfigurasi split
                                                    <strong> identik</strong>: rasio
                                                    70/15/15,{' '}
                                                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                                        random_state=42
                                                    </code>
                                                    , dan test/validation set yang berisi
                                                    pasien yang sama untuk setiap model
                                                    — tidak pernah disentuh SMOTE.
                                                    Hyperparameter tuning (GridSearchCV)
                                                    berjalan dari training awal yang
                                                    sama ukurannya. Dengan kontrol ini,
                                                    selisih metrik antar model dapat
                                                    diatribusikan langsung ke perbedaan
                                                    algoritma, bukan partisi data.
                                                </p>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Referensi: Chawla et al. (2002),{' '}
                                                    <em>
                                                        SMOTE: Synthetic Minority
                                                        Over-sampling Technique
                                                    </em>
                                                    , JAIR; Lemaitre et al. (2017),{' '}
                                                    <em>
                                                        Imbalanced-learn: A Python
                                                        Toolbox
                                                    </em>
                                                    , JMLR.
                                                </p>
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}

                {/* Bootstrap 95% CI Table */}
                {statistics.bootstrap_ci && Object.keys(statistics.bootstrap_ci).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Bootstrap 95% Confidence Interval (Test Set)</CardTitle>
                            <CardDescription>Estimasi interval kepercayaan metrik evaluasi menggunakan 1000 iterasi bootstrap</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="border font-bold">Model</TableHead>
                                            <TableHead className="text-center border font-bold">Accuracy</TableHead>
                                            <TableHead className="text-center border font-bold">Precision</TableHead>
                                            <TableHead className="text-center border font-bold">Recall</TableHead>
                                            <TableHead className="text-center border font-bold">F1-Score</TableHead>
                                            <TableHead className="text-center border font-bold">AUC-ROC</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(statistics.bootstrap_ci).map(([name, ci]) => {
                                            const isBest = name === statistics.best_model;
                                            const fmt = (m: BootstrapCI) => `${(m.mean * 100).toFixed(1)}% [${(m.ci_lower * 100).toFixed(1)}–${(m.ci_upper * 100).toFixed(1)}]`;
                                            return (
                                                <TableRow key={name} className={isBest ? 'bg-purple-50 dark:bg-purple-950' : ''}>
                                                    <TableCell className="border font-medium">{isBest && '\u{1F3C6} '}{name}</TableCell>
                                                    <TableCell className="text-center border text-sm">{ci.accuracy ? fmt(ci.accuracy) : '-'}</TableCell>
                                                    <TableCell className="text-center border text-sm">{ci.precision ? fmt(ci.precision) : '-'}</TableCell>
                                                    <TableCell className="text-center border text-sm">{ci.recall ? fmt(ci.recall) : '-'}</TableCell>
                                                    <TableCell className="text-center border text-sm">{ci.f1_score ? fmt(ci.f1_score) : '-'}</TableCell>
                                                    <TableCell className="text-center border text-sm">{ci.auc_roc ? fmt(ci.auc_roc) : '-'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ROC Curve */}
                {curves && Object.keys(curves).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>ROC Curve</CardTitle>
                            <CardDescription>Receiver Operating Characteristic — Trade-off antara True Positive Rate dan False Positive Rate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <YAxis type="number" domain={[0, 1]} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <Tooltip formatter={(value: any) => Number(value).toFixed(4)} />
                                    <Legend />
                                    {/* Diagonal reference */}
                                    <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" name="Random (AUC=0.50)" stroke="#d1d5db" strokeDasharray="5 5" dot={false} />
                                    {Object.entries(curves).map(([name, data], idx) => {
                                        const points = data.roc.fpr.map((fpr: number, i: number) => ({ fpr, tpr: data.roc.tpr[i] }));
                                        return (
                                            <Line key={name} data={points} dataKey="tpr" name={`${name} (AUC=${data.roc.auc.toFixed(3)})`} stroke={getModelColor(name, idx)} dot={false} strokeWidth={2} />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Precision-Recall Curve */}
                {curves && Object.keys(curves).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Precision-Recall Curve</CardTitle>
                            <CardDescription>Trade-off antara Precision dan Recall — penting untuk dataset tidak seimbang (MDR-TB)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="recall" type="number" domain={[0, 1]} label={{ value: 'Recall', position: 'insideBottom', offset: -5 }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <YAxis type="number" domain={[0, 1]} label={{ value: 'Precision', angle: -90, position: 'insideLeft' }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <Tooltip formatter={(value: any) => Number(value).toFixed(4)} />
                                    <Legend />
                                    {Object.entries(curves).map(([name, data], idx) => {
                                        const points = data.pr.recall.map((rec: number, i: number) => ({ recall: rec, precision: data.pr.precision[i] }));
                                        return (
                                            <Line key={name} data={points} dataKey="precision" name={`${name} (AP=${data.pr.average_precision.toFixed(3)})`} stroke={getModelColor(name, idx)} dot={false} strokeWidth={2} />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Calibration Curve */}
                {curves && Object.keys(curves).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Calibration Curve</CardTitle>
                            <CardDescription>Keandalan probabilitas prediksi — semakin dekat ke garis diagonal, semakin baik kalibrasi</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="prob_pred" type="number" domain={[0, 1]} label={{ value: 'Mean Predicted Probability', position: 'insideBottom', offset: -5 }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <YAxis type="number" domain={[0, 1]} label={{ value: 'Fraction of Positives', angle: -90, position: 'insideLeft' }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <Tooltip formatter={(value: any) => Number(value).toFixed(4)} />
                                    <Legend />
                                    {/* Perfectly calibrated reference */}
                                    <Line data={[{ prob_pred: 0, prob_true: 0 }, { prob_pred: 1, prob_true: 1 }]} dataKey="prob_true" name="Perfectly Calibrated" stroke="#d1d5db" strokeDasharray="5 5" dot={false} />
                                    {Object.entries(curves).map(([name, data], idx) => {
                                        const points = data.calibration.prob_pred.map((pp: number, i: number) => ({ prob_pred: pp, prob_true: data.calibration.prob_true[i] }));
                                        return (
                                            <Line key={name} data={points} dataKey="prob_true" name={`${name} (Brier=${data.calibration.brier_score.toFixed(3)})`} stroke={getModelColor(name, idx)} dot={true} strokeWidth={2} />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Feature Importance - Decision Tree */}
                {interpretability && (() => {
                    const dtEntry = Object.entries(interpretability).find(([n]) => n.includes('Decision Tree'));
                    if (!dtEntry || !dtEntry[1].feature_importance?.length) return null;
                    const fiData = dtEntry[1].feature_importance!.slice(0, 17);
                    return (
                        <Card>
                            <CardHeader>
                                <CardTitle>Feature Importance (Decision Tree)</CardTitle>
                                <CardDescription>Kontribusi relatif setiap fitur dalam pengambilan keputusan model Decision Tree</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={Math.max(300, fiData.length * 32)}>
                                    <BarChart data={fiData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(v: number) => (v * 100).toFixed(0) + '%'} />
                                        <YAxis type="category" dataKey="feature" width={110} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(value: any) => (Number(value) * 100).toFixed(2) + '%'} />
                                        <Bar dataKey="importance" name="Importance" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                                            {fiData.map((_, i) => <Cell key={i} fill={i === 0 ? '#f59e0b' : '#fbbf24'} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Permutation Importance - SVM */}
                {interpretability && (() => {
                    const svmEntry = Object.entries(interpretability).find(([n]) => n.includes('Support Vector Machine'));
                    if (!svmEntry || !svmEntry[1].permutation_importance?.length) return null;
                    const piData = svmEntry[1].permutation_importance!.filter(p => p.importance_mean > 0).slice(0, 17);
                    if (piData.length === 0) return null;
                    return (
                        <Card>
                            <CardHeader>
                                <CardTitle>Permutation Importance (Support Vector Machine)</CardTitle>
                                <CardDescription>Penurunan skor F1 ketika nilai fitur diacak — mengukur kontribusi setiap fitur terhadap performa SVM</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={Math.max(300, piData.length * 32)}>
                                    <BarChart data={piData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(v: number) => (v * 100).toFixed(0) + '%'} />
                                        <YAxis type="category" dataKey="feature" width={110} tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(value: any) => (Number(value) * 100).toFixed(2) + '%'} />
                                        <Bar dataKey="importance_mean" name="Mean Importance" fill="#10b981" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* SHAP Feature Importance — semua model (white-box) */}
                {interpretability && (() => {
                    const shapEntries = Object.entries(interpretability)
                        .filter(([, v]) => v.shap && v.shap.features && v.shap.features.length > 0 && v.shap.method !== 'error')
                        .sort(([a], [b]) => {
                            const rank = (n: string) => (n.includes('Support Vector Machine') ? 0 : n.includes('Logistic Regression') ? 1 : 2);
                            return rank(a) - rank(b);
                        });
                    if (shapEntries.length === 0) return null;

                    const methodLabels: Record<string, string> = {
                        linear: 'LinearExplainer (analitik: φᵢ = βᵢ·(xᵢ − E[xᵢ]))',
                        tree_proxy: 'Tree feature importance (proxy SHAP)',
                        permutation_fallback: 'Permutation (fallback)',
                        kernel_exact: 'KernelExplainer (exact SHAP, 2^M koalisi)',
                    };
                    const colors: Record<string, string> = {
                        'Logistic Regression': '#8b5cf6',
                        'Decision Tree': '#f59e0b',
                        'Support Vector Machine': '#10b981',
                    };

                    return (
                        <Card>
                            <CardHeader>
                                <CardTitle>SHAP Feature Importance (White-Box)</CardTitle>
                                <CardDescription>
                                    Kontribusi tiap fitur terhadap output model — rata-rata |SHAP value| tinggi = fitur paling menentukan prediksi.
                                    Diimplementasikan analitik (tanpa package shap/numba).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Alert className="border-violet-200 bg-violet-50/40">
                                    <AlertDescription className="text-sm text-slate-700">
                                        <p className="font-semibold mb-1">Mengapa SHAP penting untuk disertasi?</p>
                                        <p>
                                            SHAP (SHapley Additive exPlanations) menjelaskan kontribusi setiap fitur pada prediksi
                                            individual maupun agregat. Pendekatan <span className="font-medium">white-box</span> ini
                                            menunjukkan pemahaman cara kerja model — tidak hanya akurasi, tapi juga
                                            <em> interpretability</em>. Sesuai Lundberg &amp; Lee (2017), SHAP memberikan
                                            atribusi yang adil (game-theoretic Shapley values).
                                        </p>
                                        <ul className="mt-2 ml-5 list-disc space-y-0.5 text-xs">
                                            <li><span className="font-medium">Logistic Regression</span> — exact analytical: φᵢ = βᵢ·(xᵢ − E[xᵢ]) (ekuivalen LinearExplainer).</li>
                                            <li><span className="font-medium">Decision Tree</span> — tree feature_importances_ sebagai proxy mean(|SHAP|).</li>
                                            <li><span className="font-medium">SVM</span> — KernelExplainer exact SHAP: 2^M koalisi (M = jumlah fitur) dihitung natively tanpa package shap/numba, menggunakan background 50 sampel acak dari data latih bersih (n=151, seed=42).</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {shapEntries.map(([name, data]) => {
                                        const sd = data.shap!;
                                        const isSvm = name.includes('Support Vector Machine');
                                        // Konsistensi: untuk SVM, pakai sumber yang sama dengan tabel
                                        // "Kontribusi Setiap Variabel" (endpoint /dca, seed 42) — nilai
                                        // identik dengan notebook disertasi, bukan /interpretability.
                                        const dcaFeats = isSvm && dca?.contributions?.length
                                            ? dca.contributions.map(c => ({ feature: c.feature, shap_mean_abs: c.contribution }))
                                            : null;
                                        const feats = (dcaFeats ?? sd.features).slice(0, 17);
                                        const color = colors[name] || '#6366f1';
                                        return (
                                            <div key={name} className={isSvm ? 'space-y-2 lg:col-span-2' : 'space-y-2'}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-semibold">{name}</h4>
                                                    {isSvm && (
                                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 text-[10px]">
                                                            ★ Model Unggul
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="border-violet-300 text-violet-700 text-[10px]">
                                                        {methodLabels[sd.method] || sd.method}
                                                    </Badge>
                                                </div>
                                                {sd.background && (
                                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                                        Background: {sd.background}
                                                    </p>
                                                )}
                                                <ResponsiveContainer width="100%" height={Math.max(220, feats.length * 28)}>
                                                    <BarChart data={feats} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                                        <YAxis type="category" dataKey="feature" width={75} tick={{ fontSize: 9 }} />
                                                        <Tooltip formatter={(v: any) => Number(v).toFixed(4)} />
                                                        <Bar dataKey="shap_mean_abs" name="mean(|SHAP|)" fill={color} radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                {feats.length > 0 && (
                                                    <div className="rounded-md border bg-muted/30 p-2 text-xs">
                                                        <span className="font-medium">Top:</span>{' '}
                                                        <Badge variant="outline" className="text-[10px]">{feats[0].feature}</Badge>{' '}
                                                        <span className="text-muted-foreground">
                                                            (mean |SHAP| = {feats[0].shap_mean_abs.toFixed(4)})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* DCA — Decision Curve Analysis (SVM) */}
                {dca && dca.curve && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Decision Curve Analysis (DCA) — Support Vector Machine</CardTitle>
                            <CardDescription>
                                Net benefit model SVM dibandingkan dengan strategi "Treat All" dan "Treat None"
                                (Vickers &amp; Elkin, 2006) pada data internal test (n={dca.curve.n}).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="pt" type="number" domain={[0, 1]} label={{ value: 'Threshold Probability', position: 'insideBottom', offset: -5 }} tickFormatter={(v: number) => v.toFixed(1)} />
                                    <YAxis type="number" domain={['auto', 'auto']} label={{ value: 'Net Benefit', angle: -90, position: 'insideLeft' }} tickFormatter={(v: number) => v.toFixed(2)} />
                                    <Tooltip formatter={(value: any, name: any) => [Number(value).toFixed(4), name]} />
                                    <Legend />
                                    <Line data={dca.curve.thresholds.map((t, i) => ({
                                        pt: t,
                                        model: dca.curve!.net_benefit_model[i],
                                        all: dca.curve!.net_benefit_all[i],
                                        none: dca.curve!.net_benefit_none[i],
                                    }))} dataKey="none" name="Treat None" stroke="#9ca3af" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                                    <Line data={dca.curve.thresholds.map((t, i) => ({
                                        pt: t,
                                        model: dca.curve!.net_benefit_model[i],
                                        all: dca.curve!.net_benefit_all[i],
                                        none: dca.curve!.net_benefit_none[i],
                                    }))} dataKey="all" name="Treat All" stroke="#f59e0b" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                                    <Line data={dca.curve.thresholds.map((t, i) => ({
                                        pt: t,
                                        model: dca.curve!.net_benefit_model[i],
                                        all: dca.curve!.net_benefit_all[i],
                                        none: dca.curve!.net_benefit_none[i],
                                    }))} dataKey="model" name="SVM Model" stroke="#10b981" dot={false} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>

                            {dca.contributions && dca.contributions.length > 0 && (
                                <div>
                                    <p className="font-medium mb-2 text-sm">Kontribusi Setiap Variabel terhadap Prediksi (SVM)</p>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-center border font-bold w-14">Rank</TableHead>
                                                    <TableHead className="border font-bold">Variabel</TableHead>
                                                    <TableHead className="text-center border font-bold">Kontribusi (mean |SHAP|)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dca.contributions.map((c, i) => (
                                                    <TableRow key={c.feature}>
                                                        <TableCell className="text-center border font-mono">{i + 1}</TableCell>
                                                        <TableCell className="border font-medium">{c.feature}</TableCell>
                                                        <TableCell className="text-center border font-mono">{c.contribution.toFixed(4)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* External Validation — Kohort Gowa */}
                {externalValidation && externalValidation.status === 'success' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Validasi Eksternal — Kohort Kab. Gowa (Register TBC.03)</CardTitle>
                            <CardDescription>
                                Pengujian model pada data eksternal yang tidak pernah terlibat dalam pelatihan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {externalValidation.cohort && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Periode Kohort</p>
                                        <p className="font-medium text-sm">{externalValidation.cohort.period}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Lokasi</p>
                                        <p className="font-medium text-sm">{externalValidation.cohort.site}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Ukuran Sampel (n)</p>
                                        <p className="font-medium text-sm">{externalValidation.cohort.sample_size} pasien</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Berhasil</p>
                                        <p className="font-medium text-sm text-green-600">{externalValidation.cohort.success}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Tidak Berhasil</p>
                                        <p className="font-medium text-sm text-red-600">{externalValidation.cohort.failure}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs text-muted-foreground">Outcome Tidak Lengkap</p>
                                        <p className="font-medium text-sm">{externalValidation.cohort.missing_outcome}</p>
                                    </div>
                                </div>
                            )}

                            {externalValidation.cohort?.inclusion_criteria && (
                                <Alert>
                                    <AlertDescription className="text-xs space-y-1">
                                        <p><span className="font-semibold">Kriteria inklusi:</span> {externalValidation.cohort.inclusion_criteria}</p>
                                        <p><span className="font-semibold">Kriteria eksklusi:</span> {externalValidation.cohort.exclusion_criteria}</p>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {(() => {
                                const mp = externalValidation.cohort?.missing_profile;
                                const entries = mp ? Object.entries(mp) : [];
                                if (!externalValidation.cohort?.missing_profile) return null;
                                if (entries.length === 0) {
                                    return (
                                        <Alert className="border-green-200 bg-green-50/40">
                                            <AlertDescription className="text-xs">
                                                <span className="font-semibold">Profil missing value:</span>{' '}
                                                Tidak ada missing value pada seluruh fitur model ({externalValidation.cohort?.features?.length ?? 9}/{externalValidation.cohort?.features?.length ?? 9} fitur lengkap).
                                            </AlertDescription>
                                        </Alert>
                                    );
                                }
                                return (
                                    <Alert className="border-amber-200 bg-amber-50/40">
                                        <AlertDescription className="text-xs">
                                            <span className="font-semibold">Profil missing value:</span>{' '}
                                            {entries.map(([k, v]) => `${k} = ${v}`).join('; ')}.
                                        </AlertDescription>
                                    </Alert>
                                );
                            })()}

                            {externalValidation.table6?.rows && (
                                <div>
                                    <p className="font-medium mb-2 text-sm">Perbandingan Metrik: Validasi Internal vs Eksternal</p>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="border font-bold">Metrik</TableHead>
                                                    <TableHead className="text-center border font-bold">Internal (Test)</TableHead>
                                                    <TableHead className="text-center border font-bold">Eksternal (Gowa)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {externalValidation.table6.rows.map((row) => {
                                                    const isBrier = row.metric === 'Brier score';
                                                    const dp = isBrier ? 4 : 2;
                                                    const fmtCell = (val: number | undefined) => {
                                                        if (typeof val !== 'number') return '-';
                                                        return `${val.toFixed(dp)}`;
                                                    };
                                                    return (
                                                        <TableRow key={row.metric}>
                                                            <TableCell className="border font-medium">{row.metric}</TableCell>
                                                            <TableCell className="text-center border">{fmtCell(row.internal_test)}</TableCell>
                                                            <TableCell className="text-center border font-semibold">
                                                                {fmtCell(row.external_test)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {externalValidation.external_roc && (
                                <div>
                                    <p className="font-medium mb-2 text-sm">
                                        ROC Curve pada Data Eksternal (AUC = {externalValidation.external_roc.auc?.toFixed(3) ?? 'N/A'})
                                    </p>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <LineChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="fpr" type="number" domain={[0, 1]} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }} tickFormatter={(v: number) => v.toFixed(1)} />
                                            <YAxis type="number" domain={[0, 1]} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} tickFormatter={(v: number) => v.toFixed(1)} />
                                            <Tooltip formatter={(value: any) => Number(value).toFixed(4)} />
                                            <Legend />
                                            <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" name="Random (AUC=0.50)" stroke="#d1d5db" strokeDasharray="5 5" dot={false} />
                                            <Line data={externalValidation.external_roc.fpr.map((fpr: number, i: number) => ({ fpr, tpr: externalValidation.external_roc!.tpr[i] }))} dataKey="tpr" name="External SVM (9 fitur)" stroke="#10b981" dot={false} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {externalValidation.split && (
                                <p className="text-xs text-muted-foreground">
                                    Pemisahan data: internal bersih {externalValidation.split.internal_clean} (train {externalValidation.split.train}, validation {externalValidation.split.validation}, test {externalValidation.split.test}); Gowa total {externalValidation.split.gowa_total}, valid {externalValidation.split.gowa_valid}.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Rumus Metrik */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rumus Metrik Evaluasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">Accuracy</p>
                                <BlockMath math="\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}" />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">Precision</p>
                                <BlockMath math="\text{Precision} = \frac{TP}{TP + FP}" />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">Recall (Sensitivitas)</p>
                                <BlockMath math="\text{Recall} = \frac{TP}{TP + FN}" />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">F1-Score</p>
                                <BlockMath math="\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}" />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">Specificity (Spesifisitas)</p>
                                <BlockMath math="\text{Specificity} = \frac{TN}{TN + FP}" />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="font-medium mb-2">AUC-ROC</p>
                                <BlockMath math="\text{AUC} = \int_{0}^{1} TPR(FPR) \, d(FPR)" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                    <Button asChild>
                        <Link href={route('prediction.index')}>Buat Prediksi</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('prediction.history')}>Lihat Riwayat</Link>
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
