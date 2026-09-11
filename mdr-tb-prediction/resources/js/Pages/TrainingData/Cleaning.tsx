import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ShadcnComponents/ui/table';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import { ArrowLeft, Filter, AlertTriangle, CheckCircle2, Sigma, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface IqrStep {
    kolom: string;
    q1: number;
    q3: number;
    iqr: number;
    lower: number;
    upper: number;
    dibuang: number;
    sisa: number;
}

interface DroppedRow {
    id: number;
    usia: string;
    ket_usia: number;
    jenis_kelamin: string;
    bb: number;
    tb: number;
    imt: number;
    keberhasilan_pengobatan: string;
    reason: string;
    detail: {
        kolom?: string | string[];
        nilai?: number;
        batas_bawah?: number;
        batas_atas?: number;
    };
}

interface Props {
    summary: {
        total_raw: number;
        total_cleaned: number;
        total_dropped: number;
        dropped_missing: number;
        dropped_outlier: number;
        percent_dropped: number;
    };
    iqr_steps: Record<string, IqrStep | null>;
    dropped_rows: DroppedRow[];
}

export default function Cleaning({ summary, iqr_steps, dropped_rows }: Props) {
    const [filterColumn, setFilterColumn] = useState<string>('all');

    const columnOptions = useMemo(() => {
        const set = new Set<string>();
        dropped_rows.forEach((r) => {
            const k = r.detail?.kolom;
            if (typeof k === 'string') set.add(k);
        });
        return Array.from(set);
    }, [dropped_rows]);

    const filteredRows = useMemo(() => {
        if (filterColumn === 'all') return dropped_rows;
        return dropped_rows.filter((r) => r.detail?.kolom === filterColumn);
    }, [dropped_rows, filterColumn]);

    const steps = Object.entries(iqr_steps).filter(([, v]) => v !== null) as [string, IqrStep][];

    return (
        <AppLayout breadcrumbs={[{ label: 'Data Training', href: route('training-data.index') }, { label: 'Pembersihan Data' }]}>
            <Head title="Pembersihan Data" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pembersihan Data Training</h1>
                        <p className="text-sm text-muted-foreground">
                            Daftar baris yang dibuang oleh ML service sebelum model dilatih (IQR Tukey + missing value).
                        </p>
                    </div>
                    <Link href={route('training-data.index')}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali ke Data Training
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Data Mentah</CardDescription>
                            <CardTitle className="text-3xl">{summary.total_raw}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">Total baris di database</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Data Bersih</CardDescription>
                            <CardTitle className="text-3xl text-emerald-600">{summary.total_cleaned}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">Dipakai melatih model</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Dibuang</CardDescription>
                            <CardTitle className="text-3xl text-rose-600">{summary.total_dropped}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                            {summary.percent_dropped}% dari data mentah
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Penyebab</CardDescription>
                            <CardTitle className="text-base">
                                <div className="flex items-center gap-1 text-sm">
                                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                                        Missing: {summary.dropped_missing}
                                    </Badge>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-sm">
                                    <Badge variant="outline" className="border-rose-300 text-rose-700">
                                        Outlier: {summary.dropped_outlier}
                                    </Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Alert className="border-blue-200 bg-blue-50/40">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-slate-700">
                        <p className="font-semibold mb-1">Cara ML service membersihkan data</p>
                        <ol className="ml-5 list-decimal space-y-1">
                            <li>
                                <span className="font-medium">Missing value</span> &mdash; buang baris yang punya nilai
                                kosong di kolom yang dipakai model.
                            </li>
                            <li>
                                <span className="font-medium">Outlier IQR Tukey</span> &mdash; untuk tiap kolom numeric
                                (<code>Ket.Usia</code>, <code>BB</code>, <code>TB</code>, <code>IMT</code>) dihitung
                                <code className="mx-1">Q1</code> dan <code>Q3</code>. Baris dengan nilai di luar{' '}
                                <code>[Q1 &minus; 1.5&middot;IQR ; Q3 + 1.5&middot;IQR]</code> dibuang. Pengecekan
                                dilakukan sekuensial per kolom.
                            </li>
                        </ol>
                        <p className="mt-2 text-xs">
                            Logika ini identik dengan <code>DataPreprocessor.remove_outliers()</code> pada
                            <code> ml-service/src/preprocessing.py</code>.
                        </p>
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Sigma className="h-4 w-4 text-slate-500" />
                            Statistik IQR per Kolom Numeric
                        </CardTitle>
                        <CardDescription>
                            Setelah missing-value drop, IQR dihitung berurutan. Kolom yang tidak punya outlier akan
                            menampilkan &quot;0 dibuang&quot;.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kolom</TableHead>
                                        <TableHead className="text-right">Q1</TableHead>
                                        <TableHead className="text-right">Q3</TableHead>
                                        <TableHead className="text-right">IQR</TableHead>
                                        <TableHead className="text-right">Batas Bawah</TableHead>
                                        <TableHead className="text-right">Batas Atas</TableHead>
                                        <TableHead className="text-right">Dibuang</TableHead>
                                        <TableHead className="text-right">Sisa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {steps.map(([key, s]) => (
                                        <TableRow key={key}>
                                            <TableCell className="font-medium">{s.kolom}</TableCell>
                                            <TableCell className="text-right">{s.q1}</TableCell>
                                            <TableCell className="text-right">{s.q3}</TableCell>
                                            <TableCell className="text-right">{s.iqr}</TableCell>
                                            <TableCell className="text-right">{s.lower}</TableCell>
                                            <TableCell className="text-right">{s.upper}</TableCell>
                                            <TableCell className="text-right">
                                                {s.dibuang > 0 ? (
                                                    <Badge variant="outline" className="border-rose-300 text-rose-700">
                                                        {s.dibuang}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{s.sisa}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50/40 p-3 text-sm text-slate-700">
                            <p className="font-semibold mb-1 text-rose-700">
                                Kenapa kolom BB (kg) membuang 24 baris?
                            </p>
                            <p>
                                Distribusi BB pada dataset ini sangat sempit:{' '}
                                <span className="font-mono">Q1 = 45</span>,{' '}
                                <span className="font-mono">Q3 = 52.5</span>, sehingga{' '}
                                <span className="font-mono">IQR = 7.5 kg</span>. Aturan Tukey kemudian memberi ambang{' '}
                                <span className="font-mono">[Q1 &minus; 1.5&middot;IQR ; Q3 + 1.5&middot;IQR]</span> ={' '}
                                <span className="font-mono">[33.75 ; 63.75] kg</span>. Setiap pasien dengan BB di bawah
                                33.75 kg (sangat kurus) atau di atas 63.75 kg (lebih berat) dianggap outlier dan
                                dibuang. Karena 24 pasien jatuh di luar rentang itu, kolom BB menyumbang seluruh
                                outlier yang dibuang. Kolom <span className="font-mono">Ket. Usia</span>,{' '}
                                <span className="font-mono">TB</span>, dan <span className="font-mono">IMT</span>{' '}
                                tidak menambah pembuangan karena nilai mereka masih berada di dalam ambang IQR-nya
                                masing-masing.
                            </p>

                            <p className="mt-3 text-slate-700">
                                Perlu ditegaskan bahwa istilah &quot;outlier&quot; pada konteks ini bersifat murni{' '}
                                <span className="font-semibold">statistik</span>, bukan klinis. Aturan IQR Tukey hanya
                                memeriksa distribusi nilai BB tanpa melihat kolom outcome{' '}
                                <span className="font-mono">keberhasilan_pengobatan</span>; oleh karena itu wajar bila
                                sebagian pasien yang dibuang memiliki outcome{' '}
                                <span className="font-semibold">Berhasil</span>. Hal tersebut tidak menggugurkan
                                keputusan pembuangan, justru menegaskan bahwa pembuangan dilakukan berdasarkan kriteria
                                metodologis yang objektif, bukan berdasarkan label kelas. Pembuangan 24 baris ini
                                merupakan langkah preprocessing yang{' '}
                                <span className="font-semibold">harus dilakukan</span> dengan tiga justifikasi
                                berikut:
                            </p>

                            <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-700">
                                <li>
                                    <span className="font-semibold">
                                        Menjamin validitas statistik pada ukuran sampel terbatas.
                                    </span>{' '}
                                    Dengan total 175 baris, jumlah pasien yang memiliki BB ekstrem tidak mencukupi untuk
                                    membentuk pola yang stabil. Mempertahankan titik-titik ekstrem pada sampel kecil
                                    seperti ini akan membuat estimasi parameter menjadi bias dan menyebabkan{' '}
                                    <span className="italic">overfitting</span>, sehingga model kehilangan kemampuan
                                    generalisasi pada populasi pasien MDR-TB yang lebih luas. Pembuangan outlier
                                    memulihkan asumsi sampel representatif yang menjadi prasyarat inferensi statistik
                                    dan pelatihan model klasifikasi.
                                </li>
                                <li>
                                    <span className="font-semibold">
                                        BB merupakan variabel numerik yang sangat sensitif terhadap nilai ekstrem
                                        pada algoritma yang digunakan.
                                    </span>{' '}
                                    Logistic Regression mengoptimasi koefisien BB melalui{' '}
                                    <span className="italic">maximum likelihood</span> sehingga sangat dipengaruhi oleh
                                    titik jauh; Decision Tree dapat membentuk{' '}
                                    <span className="italic">split</span> dangkal seperti{' '}
                                    <span className="font-mono">BB &gt; 63.75</span> yang sebenarnya hanya memisahkan
                                    sejumlah kecil pasien sehingga mengurangi kemampuan generalisasi pohon; dan SVM
                                    dengan kernel RBF rentan menggeser{' '}
                                    <span className="italic">decision boundary</span> karena fungsi jarak Euclidean
                                    menjadi tidak proporsional terhadap nilai ekstrem. Tanpa pembuangan outlier,
                                    akurasi model pada mayoritas pasien akan menurun, sehingga pembuangan justru
                                    meningkatkan performa untuk kasus yang paling sering dijumpai di klinik.
                                </li>
                                <li>
                                    <span className="font-semibold">
                                        Konsistensi dengan standar metodologi penelitian.
                                    </span>{' '}
                                    Aturan{' '}
                                    <span className="font-mono">
                                        [Q1 &minus; 1.5&middot;IQR ; Q3 + 1.5&middot;IQR]
                                    </span>{' '}
                                    yang diperkenalkan oleh Tukey (1977) merupakan prosedur baku pendeteksian outlier
                                    yang bebas asumsi distribusi normal, transparan, dan{' '}
                                    <span className="italic">reproducible</span>. Penggunaannya pada penelitian ini
                                    menjamin bahwa proses preprocessing dapat diaudit dan direplikasi oleh peneliti
                                    lain, sekaligus menghindari subjektivitas dalam menentukan ambang batas. Karena
                                    itu, mengikuti prosedur ini bukan sekadar pilihan, melainkan kewajiban metodologis
                                    untuk menjaga validitas dan reliabilitas hasil penelitian.
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                    Daftar Baris yang Dibuang ({filteredRows.length})
                                </CardTitle>
                                <CardDescription>
                                    Setiap baris menampilkan alasan dan kolom yang melanggar batas.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select
                                    value={filterColumn}
                                    onChange={(e) => setFilterColumn(e.target.value)}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="all">Semua kolom</option>
                                    {columnOptions.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredRows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                                Tidak ada baris yang dibuang dengan filter ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Usia</TableHead>
                                            <TableHead>JK</TableHead>
                                            <TableHead className="text-right">BB</TableHead>
                                            <TableHead className="text-right">TB</TableHead>
                                            <TableHead className="text-right">IMT</TableHead>
                                            <TableHead>Outcome</TableHead>
                                            <TableHead>Alasan</TableHead>
                                            <TableHead>Detail</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRows.map((r) => {
                                            const kol = Array.isArray(r.detail?.kolom)
                                                ? r.detail.kolom.join(', ')
                                                : r.detail?.kolom;
                                            const nilai = r.detail?.nilai;
                                            const lower = r.detail?.batas_bawah;
                                            const upper = r.detail?.batas_atas;
                                            return (
                                                <TableRow key={`${r.id}-${r.reason}-${kol ?? ''}`}>
                                                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                                                    <TableCell>
                                                        {r.usia} <span className="text-muted-foreground">({r.ket_usia})</span>
                                                    </TableCell>
                                                    <TableCell>{r.jenis_kelamin}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{r.bb}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{r.tb}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{r.imt}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                r.keberhasilan_pengobatan === 'Berhasil'
                                                                    ? 'border-emerald-300 text-emerald-700'
                                                                    : 'border-rose-300 text-rose-700'
                                                            }
                                                        >
                                                            {r.keberhasilan_pengobatan}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                r.reason === 'Outlier IQR'
                                                                    ? 'border-rose-300 text-rose-700'
                                                                    : 'border-amber-300 text-amber-700'
                                                            }
                                                        >
                                                            {r.reason}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {r.reason === 'Outlier IQR' && kol && (
                                                            <span>
                                                                <span className="font-medium">{kol}</span> ={' '}
                                                                <span className="font-mono">{nilai}</span>{' '}
                                                                <span className="text-muted-foreground">
                                                                    (luar {lower}&ndash;{upper})
                                                                </span>
                                                            </span>
                                                        )}
                                                        {r.reason === 'Missing value' && (
                                                            <span className="text-muted-foreground">Kolom kosong: {kol}</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
