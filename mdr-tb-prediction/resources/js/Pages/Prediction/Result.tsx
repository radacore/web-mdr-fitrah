import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface PredictionResult {
    prediction: string;
    prediction_code: number;
    confidence: number;
    model_used: string;
    probabilities: {
        Berhasil: number;
        'Tidak Berhasil': number;
    };
}

interface Prediction {
    id: number;
    slug: string | null;
    prediction_result: string;
    model_used: string;
    confidence_score: number;
    created_at: string;
}

interface Props {
    prediction: Prediction;
    result: PredictionResult;
    input: Record<string, string>;
}

export default function Result({ prediction, result, input }: Props) {
    const isSuccess = result.prediction === 'Berhasil';
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        if (prediction.slug) {
            navigator.clipboard.writeText(`${window.location.origin}/hasil/${prediction.slug}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Label mappings for display
    const labelMappings: Record<string, string> = {
        usia: 'Kategori Usia',
        ket_usia: 'Usia (tahun)',
        jenis_kelamin: 'Jenis Kelamin',
        status_bekerja: 'Status Bekerja',
        bb: 'Berat Badan (kg)',
        tb: 'Tinggi Badan (cm)',
        imt: 'IMT',
        status_gizi: 'Status Gizi',
        status_merokok: 'Status Merokok',
        pemeriksaan_kontak: 'Pemeriksaan Kontak',
        riwayat_dm: 'Riwayat DM',
        riwayat_hiv: 'Riwayat HIV',
        komorbiditas: 'Komorbiditas',
        kepatuhan_minum_obat: 'Kepatuhan Minum Obat',
        efek_samping_obat: 'Efek Samping Obat',
        riwayat_pengobatan: 'Riwayat Pengobatan',
        panduan_pengobatan: 'Panduan Pengobatan',
        nama_lengkap: 'Nama Lengkap',
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Prediksi', href: '/prediction' }, { label: 'Hasil' }]}>
            <Head title="Hasil Prediksi" />

            <div className="space-y-6">
                {/* Hasil Prediksi */}
                <Card className={isSuccess ? 'border-green-500 border-2' : 'border-red-500 border-2'}>
                    <CardHeader className={isSuccess ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}>
                        <CardTitle className="text-center text-2xl">
                            {isSuccess ? '✅' : '❌'} {result.prediction}
                        </CardTitle>
                        <CardDescription className="text-center text-lg">
                            Tingkat Kepercayaan: <span className="font-bold">{result.confidence.toFixed(1)}%</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Probabilitas Berhasil</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    {result.probabilities.Berhasil.toFixed(1)}%
                                </p>
                            </div>
                            <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Probabilitas Tidak Berhasil</p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                    {result.probabilities['Tidak Berhasil'].toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-500">
                                Model yang digunakan: <span className="font-semibold">{result.model_used}</span>
                            </p>
                        </div>

                        {/* Shareable Link */}
                        {prediction.slug && (
                            <div className="mt-6 bg-muted/50 rounded-lg p-4 border">
                                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Link Hasil Prediksi
                                </h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Simpan atau bagikan link berikut untuk melihat kembali hasil prediksi.
                                </p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        readOnly
                                        value={`${window.location.origin}/hasil/${prediction.slug}`}
                                        className="bg-background text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyLink}
                                        className="flex-shrink-0 gap-1"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                        {copied ? 'Tersalin!' : 'Salin'}
                                    </Button>
                                </div>
                                <a
                                    href={`/hasil/${prediction.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline mt-2"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Buka halaman hasil
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                    <Button asChild>
                        <Link href={route('prediction.index')}>Prediksi Baru</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('prediction.history')}>Lihat Riwayat</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('prediction.statistics')}>Lihat Statistik Model</Link>
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
