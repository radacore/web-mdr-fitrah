import AppLayout from '@/Layouts/AppLayout';
import { DeleteConfirmModal } from '@/ShadcnComponents/DeleteConfirmModal';
import { FeatureImportanceList } from '@/ShadcnComponents/EvaluationDisplay';
import { DataPasien, HasilKlasifikasi } from '@/ShadcnComponents/HasilKlasifikasi';
import { RekomendasiTindakan } from '@/ShadcnComponents/RekomendasiTindakan';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent } from '@/ShadcnComponents/ui/card';
import { LABEL_FITUR_ML, hitungImt } from '@/lib/variabel';
import { FeatureImportance, Rekomendasi } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    prediction: {
        id: number;
        slug: string;
        prediction_result: string;
        model_used: string;
        confidence_score: number;
        probabilities: { Berhasil: number; 'Tidak Berhasil': number };
        feature_importance: FeatureImportance[] | null;
        patient_data: Record<string, string | number | null>;
        created_at: string;
        user?: { id: number; name: string };
    };
    rekomendasi: Rekomendasi;
}

export default function Show({ prediction, rekomendasi }: Props) {
    const [konfirmasi, setKonfirmasi] = useState(false);

    const imt = hitungImt(
        prediction.patient_data.bb ?? 0,
        prediction.patient_data.tb ?? 0,
    );

    const tanggal = new Date(prediction.created_at).toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Riwayat', href: route('prediction.history') },
                { label: 'Detail Klasifikasi' },
            ]}
        >
            <Head title="Detail Klasifikasi" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link
                                href={route('prediction.history')}
                                aria-label="Kembali ke riwayat"
                            >
                                <ArrowLeft className="size-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold">
                                Detail Klasifikasi
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {prediction.patient_data.nama_lengkap
                                    ? `Pasien: ${prediction.patient_data.nama_lengkap}`
                                    : `Kode: ${prediction.slug}`}
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => setKonfirmasi(true)}>
                        <Trash2 className="mr-2 size-4 text-destructive" />
                        Hapus
                    </Button>
                </div>

                <Card>
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Waktu Klasifikasi
                            </p>
                            <p className="text-sm font-medium">{tanggal}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Model</p>
                            <p className="text-sm font-medium">
                                {prediction.model_used}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Diinput oleh</p>
                            <p className="text-sm font-medium">
                                {prediction.user?.name ?? '-'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <HasilKlasifikasi
                    prediction={prediction.prediction_result}
                    confidence={prediction.confidence_score}
                    probabilities={prediction.probabilities}
                    modelUsed={prediction.model_used}
                />

                <RekomendasiTindakan rekomendasi={rekomendasi} />

                <DataPasien data={prediction.patient_data} imt={imt} />

                {prediction.feature_importance && (
                    <FeatureImportanceList
                        items={prediction.feature_importance}
                        title="Variabel Paling Berpengaruh"
                        limit={10}
                        labelMap={LABEL_FITUR_ML}
                    />
                )}
            </div>

            <DeleteConfirmModal
                open={konfirmasi}
                onOpenChange={setKonfirmasi}
                onConfirm={() => router.delete(route('prediction.destroy', prediction.id))}
                title="Hapus Riwayat Klasifikasi"
                description="Riwayat klasifikasi ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
            />
        </AppLayout>
    );
}
