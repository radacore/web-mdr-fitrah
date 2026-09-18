import AppLayout from '@/Layouts/AppLayout';
import { Pagination } from '@/ShadcnComponents/Pagination';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
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
import { Paginated } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Eye } from 'lucide-react';

interface Riwayat {
    id: number;
    slug: string;
    prediction_result: string;
    model_used: string;
    confidence_score: number;
    patient_data: { nama_lengkap?: string; ket_usia?: number; jenis_kelamin?: string };
    created_at: string;
    user?: { id: number; name: string };
}

interface Props {
    predictions: Paginated<Riwayat>;
    filters: { hasil?: string };
    isAdmin: boolean;
}

export default function History({ predictions, filters, isAdmin }: Props) {
    const filter = (hasil?: string) => {
        router.get(
            route('prediction.history'),
            { hasil },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Riwayat' }]}>
            <Head title="Riwayat Klasifikasi" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Riwayat Klasifikasi</h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin
                                ? 'Seluruh riwayat klasifikasi yang tercatat pada sistem.'
                                : 'Riwayat klasifikasi yang Anda lakukan.'}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={route('prediction.index')}>
                            <Activity className="mr-2 size-4" />
                            Klasifikasi Baru
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">
                            Daftar Riwayat ({predictions.total})
                        </CardTitle>
                        <Select
                            value={filters.hasil ?? 'semua'}
                            onValueChange={(nilai) =>
                                filter(nilai === 'semua' ? undefined : nilai)
                            }
                        >
                            <SelectTrigger
                                className="w-48"
                                aria-label="Filter hasil klasifikasi"
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
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pasien</TableHead>
                                        <TableHead>Hasil</TableHead>
                                        <TableHead className="text-right">
                                            Keyakinan
                                        </TableHead>
                                        {isAdmin && <TableHead>Diinput oleh</TableHead>}
                                        <TableHead>Waktu</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {predictions.data.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={isAdmin ? 6 : 5}
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                Belum ada riwayat klasifikasi.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {predictions.data.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.patient_data?.nama_lengkap ||
                                                    item.slug}
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {item.patient_data?.ket_usia
                                                        ? `${item.patient_data.ket_usia} th`
                                                        : ''}
                                                    {item.patient_data?.jenis_kelamin
                                                        ? ` · ${item.patient_data.jenis_kelamin}`
                                                        : ''}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        item.prediction_result ===
                                                        'Berhasil'
                                                            ? 'secondary'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {item.prediction_result}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {item.confidence_score.toFixed(2)}%
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell className="text-muted-foreground">
                                                    {item.user?.name ?? '-'}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-muted-foreground">
                                                {new Date(
                                                    item.created_at,
                                                ).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                >
                                                    <Link
                                                        href={route(
                                                            'prediction.show',
                                                            item.id,
                                                        )}
                                                        aria-label="Lihat detail"
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={predictions.links}
                            from={predictions.from}
                            to={predictions.to}
                            total={predictions.total}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
