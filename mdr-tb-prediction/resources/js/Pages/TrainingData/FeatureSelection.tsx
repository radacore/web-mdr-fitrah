import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ShadcnComponents/ui/table';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import { ArrowLeft, Filter, Layers, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

interface FeatureRow {
    name: string;
    status: 'accepted' | 'rejected';
    group: 'A' | 'B' | 'C' | 'pre' | null;
    reason: string;
    detail: Record<string, unknown> | null;
    correlation_values: { partner: string; r: number } | null;
    vif: number | null;
    odds_ratio: number | null;
    p_value: number | null;
    significant: boolean | null;
    rf_importance: number | null;
    rfe_rank: number | null;
    selection_rate: number | null;
}

interface Stability {
    per_fold_subsets: string[][];
    selection_rate: Record<string, number>;
    jaccard_mean: number;
    select_threshold: number;
    stable_features: string[];
    n_folds: number;
}

interface CorrelationMatrix {
    labels: string[];
    matrix: number[][];
}

interface FeatureSelectionData {
    selected_features: string[];
    summary: { total: number; accepted: number; rejected: number };
    features: FeatureRow[];
    stability: Stability;
    correlation_matrix: CorrelationMatrix;
    groups_definition: Record<string, string>;
    firth_method: string;
    config: Record<string, number | string>;
}

interface Props {
    featureSelection: FeatureSelectionData | null;
    error: string | null;
}

const groupColor: Record<string, string> = {
    A: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    B: 'border-blue-300 text-blue-700 bg-blue-50',
    C: 'border-violet-300 text-violet-700 bg-violet-50',
    pre: 'border-rose-300 text-rose-700 bg-rose-50',
};

const groupLabel: Record<string, string> = {
    A: 'A — Statistik',
    B: 'B — Klinis',
    C: 'C — Komputasional',
    pre: 'Pra-seleksi',
};

function fmt(v: number | null, digits = 4): string {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    return v.toFixed(digits);
}

function fmtP(p: number | null): string {
    if (p === null || Number.isNaN(p)) return '—';
    if (p < 0.001) return '<0.001';
    return p.toFixed(4);
}

function corrColor(r: number): string {
    const a = Math.min(1, Math.abs(r));
    return r >= 0 ? `rgba(220,38,38,${a})` : `rgba(29,78,216,${a})`;
}

export default function FeatureSelection({ featureSelection, error }: Props) {
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterGroup, setFilterGroup] = useState<string>('all');

    const filteredFeatures = useMemo(() => {
        if (!featureSelection) return [];
        return featureSelection.features.filter((f) => {
            const okStatus = filterStatus === 'all' || f.status === filterStatus;
            const okGroup = filterGroup === 'all' || f.group === filterGroup;
            return okStatus && okGroup;
        });
    }, [featureSelection, filterStatus, filterGroup]);

    if (error || !featureSelection) {
        return (
            <AppLayout breadcrumbs={[{ label: 'Data Training', href: route('training-data.index') }, { label: 'Seleksi Fitur' }]}>
                <Head title="Seleksi Fitur" />
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Hybrid Feature Selection</h1>
                            <p className="text-sm text-muted-foreground">
                                Verdict per-fitur (Accepted/Rejected + alasan) dari ML service.
                            </p>
                        </div>
                        <Link href={route('training-data.index')}>
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Kembali
                            </Button>
                        </Link>
                    </div>
                    <Alert className="border-amber-200 bg-amber-50/40">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm text-slate-700">
                            {error ?? 'Feature selection belum tersedia. Jalankan retrain pada ML Service.'}
                        </AlertDescription>
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    const { summary, stability, correlation_matrix, groups_definition, firth_method } = featureSelection;
    const labels = correlation_matrix?.labels ?? [];
    const matrix = correlation_matrix?.matrix ?? [];

    return (
        <AppLayout breadcrumbs={[{ label: 'Data Training', href: route('training-data.index') }, { label: 'Seleksi Fitur' }]}>
            <Head title="Seleksi Fitur" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Hybrid Feature Selection</h1>
                        <p className="text-sm text-muted-foreground">
                            Metodologi Filter-Wrapper (Kelompok A/B/C + pra-seleksi). Leakage-safe, dihitung pada data training.
                        </p>
                    </div>
                    <Link href={route('training-data.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Fitur</CardDescription>
                            <CardTitle className="text-3xl">{summary.total}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">Kandidat awal</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Diterima</CardDescription>
                            <CardTitle className="text-3xl text-emerald-600">{summary.accepted}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">Masuk model ML</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Ditolak</CardDescription>
                            <CardTitle className="text-3xl text-rose-600">{summary.rejected}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">Dibuang/konstan/redundan</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Stabilitas (Jaccard)</CardDescription>
                            <CardTitle className="text-3xl text-blue-600">{fmt(stability?.jaccard_mean, 2)}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                            {stability?.n_folds}-fold, threshold {stability?.select_threshold}
                        </CardContent>
                    </Card>
                </div>

                <Alert className="border-blue-200 bg-blue-50/40">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-slate-700">
                        <p className="font-semibold mb-1">Metodologi Sistematis-Hibrida</p>
                        <ol className="ml-5 list-decimal space-y-1">
                            <li>
                                <span className="font-medium">Pra-seleksi</span> &mdash; buang konstanta, korelasi
                                tinggi (|r|&gt;0.8), VIF tinggi (&gt;10).
                            </li>
                            <li>
                                <span className="font-medium">Kelompok A (statistik)</span> &mdash; Firth penalized
                                logistic p&lt;0.05 (robust di small n / quasi-separation).
                            </li>
                            <li>
                                <span className="font-medium">Kelompok B (klinis)</span> &mdash; justifikasi klinis
                                meski marginal (Riwayat DM, Komorbiditas).
                            </li>
                            <li>
                                <span className="font-medium">Kelompok C (komputasional)</span> &mdash; RFE + Random
                                Forest importance + stabilitas seleksi.
                            </li>
                            <li>
                                <span className="font-medium">Stabilitas</span> &mdash; RFE per fold (10-fold), Jaccard
                                pairwise. Subset final dibekukan ke <code>preprocessor.pkl</code>.
                            </li>
                        </ol>
                        <p className="mt-2 text-xs">
                            Kelompok: A={String(groups_definition?.A ?? '')} · B={String(groups_definition?.B ?? '')} ·
                            C={String(groups_definition?.C ?? '')} · Metode firth: <code>{firth_method}</code>.
                        </p>
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Filter className="h-4 w-4 text-slate-500" />
                                    Feature Selection Summary ({filteredFeatures.length})
                                </CardTitle>
                                <CardDescription>
                                    Variabel Diterima/Ditolak beserta alasan &mdash; transparansi metodologi untuk disertasi.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="all">Semua status</option>
                                    <option value="accepted">Diterima</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                                <select
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="all">Semua kelompok</option>
                                    <option value="A">A — Statistik</option>
                                    <option value="B">B — Klinis</option>
                                    <option value="C">C — Komputasional</option>
                                    <option value="pre">Pra-seleksi</option>
                                </select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fitur</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Kelompok</TableHead>
                                        <TableHead className="text-right">OR (Firth)</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">RF Imp.</TableHead>
                                        <TableHead className="text-right">RFE Rank</TableHead>
                                        <TableHead className="text-right">Sel. Rate</TableHead>
                                        <TableHead>Alasan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFeatures.map((f) => (
                                        <TableRow
                                            key={f.name}
                                            className={f.status === 'accepted' ? 'bg-emerald-50/30' : ''}
                                        >
                                            <TableCell className="font-medium">{f.name}</TableCell>
                                            <TableCell>
                                                {f.status === 'accepted' ? (
                                                    <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                                        Diterima
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-rose-300 text-rose-700">
                                                        <XCircle className="mr-1 h-3 w-3" />
                                                        Ditolak
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {f.group && (
                                                    <Badge variant="outline" className={groupColor[f.group]}>
                                                        {groupLabel[f.group]}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmt(f.odds_ratio, 2)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmtP(f.p_value)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmt(f.rf_importance, 4)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {f.rfe_rank !== null ? f.rfe_rank : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmt(f.selection_rate, 2)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{f.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Matriks Korelasi</CardTitle>
                        <CardDescription>
                            Pra-seleksi: pasangan |r|&gt;0.8 menyebabkan salah satu fitur dibuang (redundansi).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {labels.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="text-xs">
                                    <thead>
                                        <tr>
                                            <th className="p-1" />
                                            {labels.map((l) => (
                                                <th key={l} className="p-1 font-medium text-muted-foreground">
                                                    <div className="max-w-[60px]" style={{ writingMode: 'vertical-rl' }}>
                                                        {l}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrix.map((row, i) => (
                                            <tr key={labels[i]}>
                                                <td className="p-1 font-medium text-muted-foreground whitespace-nowrap">
                                                    {labels[i]}
                                                </td>
                                                {row.map((v, j) => (
                                                    <td
                                                        key={j}
                                                        className="p-1 text-center font-mono"
                                                        style={{
                                                            backgroundColor: corrColor(v),
                                                            color: Math.abs(v) > 0.6 ? '#fff' : '#000',
                                                        }}
                                                        title={`${labels[i]} × ${labels[j]}: ${v.toFixed(3)}`}
                                                    >
                                                        {v.toFixed(1)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Matriks korelasi tidak tersedia.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Stabilitas Seleksi (10-fold)</CardTitle>
                        <CardDescription>
                            RFE dijalankan pada tiap fold (fit hanya di sub-train). Selection rate &mdash; proporsi fold
                            yang memilih fitur. Jaccard mean: konsistensi subset antar fold.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fitur</TableHead>
                                        <TableHead className="text-right">Selection Rate</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(stability?.selection_rate ?? {}).map(([name, rate]) => (
                                        <TableRow key={name}>
                                            <TableCell className="font-medium">{name}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">{fmt(rate, 2)}</TableCell>
                                            <TableCell>
                                                {rate >= (stability?.select_threshold ?? 0.6) ? (
                                                    <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                                                        Stabil
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-slate-300 text-slate-600">
                                                        Tidak stabil
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
