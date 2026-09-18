import AppLayout from '@/Layouts/AppLayout';
import {
    FeatureImportanceList,
} from '@/ShadcnComponents/EvaluationDisplay';
import { DataPasien, HasilKlasifikasi } from '@/ShadcnComponents/HasilKlasifikasi';
import { RekomendasiTindakan } from '@/ShadcnComponents/RekomendasiTindakan';
import { Button } from '@/ShadcnComponents/ui/button';
import { LABEL_FITUR_ML, hitungImt } from '@/lib/variabel';
import { FeatureImportance, Rekomendasi } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { History, RotateCcw } from 'lucide-react';

interface Props {
    prediction: { id: number; created_at: string };
    result: {
        prediction: string;
        confidence: number;
        model_used: string;
        probabilities: { Berhasil: number; 'Tidak Berhasil': number };
        feature_importance?: FeatureImportance[];
    };
    input: Record<string, string | number | null>;
    rekomendasi: Rekomendasi;
}

export default function Result({ prediction, result, input, rekomendasi }: Props) {
    const imt = hitungImt(input.bb ?? 0, input.tb ?? 0);

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Klasifikasi', href: route('prediction.index') },
                { label: 'Hasil' },
            ]}
        >
            <Head title="Hasil Klasifikasi" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Hasil Klasifikasi</h1>
                        {input.nama_lengkap && (
                            <p className="text-sm text-muted-foreground">
                                Pasien: {input.nama_lengkap}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('prediction.index')}>
                                <RotateCcw className="mr-2 size-4" />
                                Klasifikasi Baru
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('prediction.show', prediction.id)}>
                                <History className="mr-2 size-4" />
                                Lihat Detail
                            </Link>
                        </Button>
                    </div>
                </div>

                <HasilKlasifikasi
                    prediction={result.prediction}
                    confidence={result.confidence}
                    probabilities={result.probabilities}
                    modelUsed={result.model_used}
                />

                <RekomendasiTindakan rekomendasi={rekomendasi} />

                <DataPasien data={input} imt={imt} />

                {result.feature_importance && (
                    <FeatureImportanceList
                        items={result.feature_importance}
                        title="Variabel Paling Berpengaruh"
                        limit={10}
                        labelMap={LABEL_FITUR_ML}
                    />
                )}
            </div>
        </AppLayout>
    );
}
