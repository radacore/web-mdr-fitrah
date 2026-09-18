import AppLayout from '@/Layouts/AppLayout';
import { DeleteConfirmModal } from '@/ShadcnComponents/DeleteConfirmModal';
import { Pagination } from '@/ShadcnComponents/Pagination';
import { Alert, AlertDescription, AlertTitle } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ShadcnComponents/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ShadcnComponents/ui/table';
import { useMlProcess } from '@/hooks/use-ml-process';
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Eye,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface Baris {
    id: number;
    usia: string;
    ket_usia: number;
    jenis_kelamin: string;
    bb: number;
    tb: number;
    imt: number;
    status_gizi: string;
    kepatuhan_minum_obat: string;
    keberhasilan_pengobatan: string;
}

interface Stats {
    total: number;
    berhasil: number;
    tidak_berhasil: number;
    persen_berhasil: number;
    persen_tidak_berhasil: number;
    rasio_ketidakseimbangan: number;
    kelas_minoritas: string;
    training_count: number;
    testing_count: number;
    split_ratio: string;
}

interface HasilRetrain {
    status?: string;
    message?: string;
    cleaned_data_count?: number;
    test_metrics?: { accuracy: number; recall: number; f1_score: number };
    best_params?: Record<string, string | number | null>;
    error?: string;
}

interface Props {
    trainingData: Paginated<Baris>;
    filters: { search?: string; outcome?: string };
    stats: Stats;
}

export default function Index({ trainingData, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [target, setTarget] = useState<Baris | null>(null);

    const {
        data: hasilRetrain,
        memuat: melatih,
        galat,
        jalankan: latihUlang,
    } = useMlProcess<HasilRetrain>('/api/retrain');

    const terapkanFilter = (perubahan: Record<string, string | undefined>) => {
        router.get(
            route('training-data.index'),
            { search, outcome: filters.outcome, ...perubahan },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Data Rekam Medis' }]}>
            <Head title="Data Rekam Medis" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Data Rekam Medis</h1>
                        <p className="text-sm text-muted-foreground">
                            Dataset rekam medis pasien MDR-TB yang digunakan untuk
                            melatih model klasifikasi.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('training-data.cleaning')}>
                                <Sparkles className="mr-2 size-4" />
                                Pembersihan Data
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={latihUlang}
                            disabled={melatih || stats.total < 10}
                        >
                            {melatih ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 size-4" />
                            )}
                            {melatih ? 'Melatih...' : 'Latih Ulang Model'}
                        </Button>
                        <Button asChild>
                            <Link href={route('training-data.create')}>
                                <Plus className="mr-2 size-4" />
                                Tambah Data
                            </Link>
                        </Button>
                    </div>
                </div>

                {galat && (
                    <Alert variant="destructive">
                        <AlertTitle>Pelatihan gagal</AlertTitle>
                        <AlertDescription>{galat}</AlertDescription>
                    </Alert>
                )}

                {hasilRetrain?.status === 'success' && (
                    <Alert>
                        <CheckCircle2 className="size-4" />
                        <AlertTitle>Model berhasil dilatih ulang</AlertTitle>
                        <AlertDescription>
                            {hasilRetrain.message} Data bersih:{' '}
                            {hasilRetrain.cleaned_data_count} baris.
                            {hasilRetrain.test_metrics && (
                                <>
                                    {' '}
                                    Recall data uji:{' '}
                                    {(hasilRetrain.test_metrics.recall * 100).toFixed(2)}%,
                                    F1-score:{' '}
                                    {(hasilRetrain.test_metrics.f1_score * 100).toFixed(2)}
                                    %.
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            label: 'Total Data',
                            nilai: stats.total,
                            keterangan: `${stats.training_count} latih · ${stats.testing_count} uji (${stats.split_ratio})`,
                        },
                        {
                            label: 'Berhasil',
                            nilai: stats.berhasil,
                            keterangan: `${stats.persen_berhasil}% dari total`,
                        },
                        {
                            label: 'Tidak Berhasil',
                            nilai: stats.tidak_berhasil,
                            keterangan: `${stats.persen_tidak_berhasil}% dari total`,
                        },
                        {
                            label: 'Rasio Ketidakseimbangan',
                            nilai: `${stats.rasio_ketidakseimbangan}:1`,
                            keterangan: `Minoritas: ${stats.kelas_minoritas}`,
                        },
                    ].map((item) => (
                        <Card key={item.label}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {item.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold tabular-nums">
                                    {item.nilai}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.keterangan}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">
                            Daftar Data ({trainingData.total})
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    terapkanFilter({});
                                }}
                                className="relative"
                            >
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari data"
                                    className="w-44 pl-8"
                                    aria-label="Cari data rekam medis"
                                />
                            </form>
                            <Select
                                value={filters.outcome ?? 'semua'}
                                onValueChange={(nilai) =>
                                    terapkanFilter({
                                        outcome: nilai === 'semua' ? undefined : nilai,
                                    })
                                }
                            >
                                <SelectTrigger
                                    className="w-44"
                                    aria-label="Filter hasil pengobatan"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="semua">Semua Hasil</SelectItem>
                                    <SelectItem value="Berhasil">Berhasil</SelectItem>
                                    <SelectItem value="Tidak Berhasil">
                                        Tidak Berhasil
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usia</TableHead>
                                        <TableHead>Jenis Kelamin</TableHead>
                                        <TableHead className="text-right">BB/TB</TableHead>
                                        <TableHead className="text-right">IMT</TableHead>
                                        <TableHead>Status Gizi</TableHead>
                                        <TableHead>Kepatuhan</TableHead>
                                        <TableHead>Hasil</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trainingData.data.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                Tidak ada data yang cocok.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {trainingData.data.map((baris) => (
                                        <TableRow key={baris.id}>
                                            <TableCell>
                                                <span className="font-medium tabular-nums">
                                                    {baris.ket_usia} th
                                                </span>
                                                <span className="ml-1.5 text-xs text-muted-foreground">
                                                    {baris.usia}
                                                </span>
                                            </TableCell>
                                            <TableCell>{baris.jenis_kelamin}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {baris.bb}/{baris.tb}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {baris.imt}
                                            </TableCell>
                                            <TableCell>{baris.status_gizi}</TableCell>
                                            <TableCell>
                                                {baris.kepatuhan_minum_obat}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        baris.keberhasilan_pengobatan ===
                                                        'Berhasil'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {baris.keberhasilan_pengobatan}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={route(
                                                                'training-data.show',
                                                                baris.id,
                                                            )}
                                                            aria-label="Lihat detail"
                                                        >
                                                            <Eye className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={route(
                                                                'training-data.edit',
                                                                baris.id,
                                                            )}
                                                            aria-label="Ubah data"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setTarget(baris)}
                                                        aria-label="Hapus data"
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={trainingData.links}
                            from={trainingData.from}
                            to={trainingData.to}
                            total={trainingData.total}
                        />
                    </CardContent>
                </Card>
            </div>

            <DeleteConfirmModal
                open={Boolean(target)}
                onOpenChange={(open) => !open && setTarget(null)}
                onConfirm={() => {
                    if (!target) return;
                    router.delete(route('training-data.destroy', target.id), {
                        onFinish: () => setTarget(null),
                    });
                }}
                title="Hapus Data Rekam Medis"
                description="Data ini akan dihapus permanen dan tidak lagi digunakan pada pelatihan model berikutnya."
            />
        </AppLayout>
    );
}
