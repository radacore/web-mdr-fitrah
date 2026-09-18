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
import { LABEL } from '@/lib/variabel';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface BarisDibuang {
    id: number;
    alasan: string;
    detail: string;
}

interface Props {
    summary: {
        total_awal: number;
        total_bersih: number;
        total_dibuang: number;
        dibuang_missing: number;
        dibuang_duplikat: number;
        persen_dibuang: number;
    };
    droppedRows: BarisDibuang[];
    requiredColumns: string[];
}

export default function Cleaning({ summary, droppedRows, requiredColumns }: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Data Rekam Medis', href: route('training-data.index') },
                { label: 'Pembersihan Data' },
            ]}
        >
            <Head title="Pembersihan Data" />

            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={route('training-data.index')} aria-label="Kembali">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Pembersihan Data</h1>
                        <p className="text-sm text-muted-foreground">
                            Tahap data cleaning menangani nilai yang hilang dan data
                            duplikat sebelum dataset digunakan untuk melatih model.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            label: 'Data Awal',
                            nilai: summary.total_awal,
                            keterangan: 'Sebelum pembersihan',
                        },
                        {
                            label: 'Data Bersih',
                            nilai: summary.total_bersih,
                            keterangan: 'Siap digunakan untuk pelatihan',
                        },
                        {
                            label: 'Nilai Hilang',
                            nilai: summary.dibuang_missing,
                            keterangan: 'Baris dengan kolom kosong',
                        },
                        {
                            label: 'Data Duplikat',
                            nilai: summary.dibuang_duplikat,
                            keterangan: 'Baris dengan nilai identik',
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

                {summary.total_dibuang === 0 ? (
                    <Alert>
                        <CheckCircle2 className="size-4" />
                        <AlertTitle>Dataset sudah bersih</AlertTitle>
                        <AlertDescription>
                            Seluruh {summary.total_awal} data lengkap dan tidak ada
                            duplikat, sehingga semuanya dapat digunakan untuk melatih model.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert variant="destructive">
                        <AlertTitle>
                            {summary.total_dibuang} data tidak digunakan (
                            {summary.persen_dibuang}% dari total)
                        </AlertTitle>
                        <AlertDescription>
                            Data yang tidak lengkap atau duplikat dikecualikan agar tidak
                            menurunkan kualitas model.
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Kolom Wajib yang Diperiksa
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            17 variabel penelitian beserta variabel target. Kolom
                            keterangan efek samping dikecualikan karena berupa teks bebas.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                            {requiredColumns.map((kolom) => (
                                <Badge key={kolom} variant="secondary">
                                    {LABEL[kolom] ?? kolom}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {droppedRows.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Rincian Data yang Dibuang
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Data</TableHead>
                                            <TableHead>Alasan</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {droppedRows.map((baris) => (
                                            <TableRow key={baris.id}>
                                                <TableCell className="font-medium tabular-nums">
                                                    {baris.id}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive">
                                                        {baris.alasan}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {baris.detail}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
