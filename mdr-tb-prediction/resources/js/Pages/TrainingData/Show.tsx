import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import {
    KELOMPOK_VARIABEL,
    LABEL,
    formatTanggal,
    hitungDurasiPengobatan,
    tentukanStatusPengobatan,
} from '@/lib/variabel';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { TrainingDataRecord } from './Partials/TrainingDataForm';

export default function Show({ trainingData }: { trainingData: TrainingDataRecord }) {
    const berhasil = trainingData.keberhasilan_pengobatan === 'Berhasil';
    const durasi = hitungDurasiPengobatan(
        trainingData.tanggal_awal_pengobatan ?? '',
    );
    const statusPengobatan = trainingData.tanggal_awal_pengobatan
        ? tentukanStatusPengobatan(durasi.bulan)
        : '-';

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Data Rekam Medis', href: route('training-data.index') },
                { label: 'Detail Data' },
            ]}
        >
            <Head title="Detail Data Rekam Medis" />

            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link
                                href={route('training-data.index')}
                                aria-label="Kembali"
                            >
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold">Detail Data</h1>
                            <p className="text-sm text-muted-foreground">
                                Data rekam medis nomor {trainingData.id}
                            </p>
                        </div>
                    </div>
                    <Button asChild>
                        <Link href={route('training-data.edit', trainingData.id)}>
                            <Pencil className="mr-2 size-4" />
                            Ubah Data
                        </Link>
                    </Button>
                </div>

                <Card
                    className={
                        berhasil
                            ? 'border-emerald-300 dark:border-emerald-900'
                            : 'border-red-300 dark:border-red-900'
                    }
                >
                    <CardContent className="flex items-center justify-between pt-6">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {LABEL.keberhasilan_pengobatan}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Variabel target pada proses klasifikasi
                            </p>
                        </div>
                        <Badge
                            variant={berhasil ? 'secondary' : 'destructive'}
                            className="text-sm"
                        >
                            {trainingData.keberhasilan_pengobatan}
                        </Badge>
                    </CardContent>
                </Card>

                {KELOMPOK_VARIABEL.map((kelompok) => (
                    <Card key={kelompok.judul}>
                        <CardHeader>
                            <CardTitle className="text-base">{kelompok.judul}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                {kelompok.fields.map((nama) => (
                                    <div
                                        key={nama}
                                        className="flex items-baseline justify-between gap-3 border-b pb-2"
                                    >
                                        <dt className="text-sm text-muted-foreground">
                                            {LABEL[nama]}
                                        </dt>
                                        <dd className="text-right text-sm font-medium">
                                            {String(
                                                trainingData[
                                                    nama as keyof TrainingDataRecord
                                                ] ?? '-',
                                            )}
                                        </dd>
                                    </div>
                                ))}

                                {kelompok.judul === 'Kondisi Fisik' && (
                                    <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                                        <dt className="text-sm text-muted-foreground">
                                            {LABEL.imt}
                                        </dt>
                                        <dd className="text-right text-sm font-medium tabular-nums">
                                            {trainingData.imt}
                                        </dd>
                                    </div>
                                )}

                                {kelompok.judul === 'Data Pengobatan' && (
                                    <>
                                        <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                                            <dt className="text-sm text-muted-foreground">
                                                {LABEL.tanggal_awal_pengobatan}
                                            </dt>
                                            <dd className="text-right text-sm font-medium">
                                                {formatTanggal(
                                                    trainingData.tanggal_awal_pengobatan,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                                            <dt className="text-sm text-muted-foreground">
                                                {LABEL.durasi_pengobatan}
                                            </dt>
                                            <dd className="text-right text-sm font-medium tabular-nums">
                                                {durasi.label || '-'}
                                            </dd>
                                        </div>
                                        <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                                            <dt className="text-sm text-muted-foreground">
                                                {LABEL.status_pengobatan}
                                            </dt>
                                            <dd className="text-right text-sm font-medium">
                                                {statusPengobatan}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </dl>

                            {kelompok.judul === 'Data Pengobatan' &&
                                trainingData.keterangan_efek_samping && (
                                    <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {LABEL.keterangan_efek_samping}
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {trainingData.keterangan_efek_samping}
                                        </p>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AppLayout>
    );
}
