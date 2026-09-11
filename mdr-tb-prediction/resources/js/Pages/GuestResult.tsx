import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import { Button } from '@/ShadcnComponents/ui/button';
import { Input } from '@/ShadcnComponents/ui/input';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import Navbar from '@/ShadcnComponents/Navbar';
import Footer from '@/ShadcnComponents/Footer';
import { useState } from 'react';
import { getDecodedValue } from '@/Pages/Prediction/Show';

interface Prediction {
    id: number;
    slug: string;
    patient_data: Record<string, string>;
    prediction_result: string;
    model_used: string;
    confidence_score: number;
    probabilities: Record<string, number>;
    created_at: string;
}

const labelMappings: Record<string, string> = {
    nama_lengkap: 'Nama Lengkap',
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
    keterangan_efek_samping: 'Keterangan Efek Samping',
};

// Sensor nama: "Andi Pratama" → "A*** P******"
const censorName = (name: string): string => {
    return name.split(' ').map(word => {
        if (word.length <= 1) return word;
        return word[0].toUpperCase() + '*'.repeat(word.length - 1);
    }).join(' ');
};

export default function GuestResult({ prediction }: { prediction: Prediction }) {
    const [copied, setCopied] = useState(false);
    const isSuccess = prediction.prediction_result === 'Berhasil';
    const data = prediction.patient_data;

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Confidence interpretation
    const getConfidenceLabel = (score: number) => {
        if (score >= 80) return { text: 'Sangat Tinggi', color: 'text-green-600' };
        if (score >= 60) return { text: 'Tinggi', color: 'text-purple-600' };
        if (score >= 40) return { text: 'Sedang', color: 'text-amber-600' };
        return { text: 'Rendah', color: 'text-red-600' };
    };
    const confidenceInfo = getConfidenceLabel(prediction.confidence_score);

    // Charts data
    const probabilityData = prediction.probabilities ? [
        { name: 'Berhasil', value: prediction.probabilities.Berhasil ?? 0, fill: '#22c55e' },
        { name: 'Tidak Berhasil', value: prediction.probabilities['Tidak Berhasil'] ?? 0, fill: '#ef4444' },
    ] : [];

    const gaugeData = [{ name: 'Confidence', value: prediction.confidence_score, fill: isSuccess ? '#22c55e' : '#ef4444' }];

    // Risk & positive factors
    const getRiskFactors = () => {
        const risks: string[] = [];
        if (data.kepatuhan_minum_obat === '1') risks.push('Tidak patuh minum obat');
        if (data.komorbiditas === '1') risks.push('Memiliki komorbiditas');
        if (data.riwayat_dm === '1') risks.push('Riwayat diabetes mellitus');
        if (data.riwayat_hiv === '1') risks.push('Riwayat HIV positif');
        if (data.efek_samping_obat === '1') risks.push('Mengalami efek samping obat');
        if (data.status_merokok === '1') risks.push('Merokok');
        if (data.riwayat_pengobatan === '1') risks.push('Kasus pengobatan lama');
        if (data.usia === '1') risks.push('Usia lanjut (>45 tahun)');
        return risks;
    };

    const getPositiveFactors = () => {
        const positives: string[] = [];
        if (data.kepatuhan_minum_obat === '0') positives.push('Patuh minum obat');
        if (data.komorbiditas === '0') positives.push('Tidak ada komorbiditas');
        if (data.riwayat_dm === '0') positives.push('Tidak ada riwayat DM');
        if (data.riwayat_hiv === '0') positives.push('HIV negatif');
        if (data.efek_samping_obat === '0') positives.push('Tidak ada efek samping obat');
        if (data.status_merokok === '0') positives.push('Tidak merokok');
        return positives;
    };

    const riskFactors = getRiskFactors();
    const positiveFactors = getPositiveFactors();

    return (
        <>
            <Head title="Hasil Prediksi MDR-TB" />
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-8">
                    {/* Back + Share header */}
                    <div className="flex items-center justify-between mb-6">
                        <a href="/lakukan-prediksi" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4" />
                            Kembali ke Form Prediksi
                        </a>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={window.location.href} className="w-64 text-xs bg-white" />
                            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1 flex-shrink-0">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Tersalin!' : 'Salin'}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Header Card */}
                        <Card className={`border-2 overflow-hidden ${isSuccess ? 'border-green-500' : 'border-red-500'}`}>
                            <CardHeader className={isSuccess ? 'bg-green-50' : 'bg-red-50'}>
                                <CardTitle className="text-center text-2xl">
                                    {isSuccess ? '\u2705' : '\u274C'} Prediksi: {prediction.prediction_result}
                                </CardTitle>
                                <CardDescription className="text-center">
                                    Dianalisis pada {new Date(prediction.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} menggunakan model <strong>{prediction.model_used}</strong>
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Doughnut Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">📊 Grafik Probabilitas</CardTitle>
                                    <CardDescription>Perbandingan visual peluang hasil pengobatan</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {prediction.probabilities ? (
                                        <div className="flex flex-col items-center">
                                            <ResponsiveContainer width="100%" height={250}>
                                                <PieChart>
                                                    <Pie data={probabilityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                                                        {probabilityData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toFixed(1)}%`} />
                                                    <Legend verticalAlign="bottom" formatter={(value: string) => <span className="text-sm font-medium">{value}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="grid grid-cols-2 gap-4 w-full mt-2">
                                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                                    <p className="text-2xl font-bold text-green-600">{prediction.probabilities.Berhasil?.toFixed(1) ?? 0}%</p>
                                                    <p className="text-xs text-gray-500">Berhasil</p>
                                                </div>
                                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                                    <p className="text-2xl font-bold text-red-600">{prediction.probabilities['Tidak Berhasil']?.toFixed(1) ?? 0}%</p>
                                                    <p className="text-xs text-gray-500">Tidak Berhasil</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-center text-gray-500">Data probabilitas tidak tersedia</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Confidence Gauge */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">🎯 Skor Keyakinan Model</CardTitle>
                                    <CardDescription>Seberapa yakin model terhadap prediksi ini</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={20} data={gaugeData} startAngle={180} endAngle={0}>
                                                <RadialBar background={{ fill: '#f3f4f6' }} dataKey="value" cornerRadius={10} />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="text-center -mt-20 mb-6">
                                            <p className={`text-4xl font-bold ${confidenceInfo.color}`}>{prediction.confidence_score.toFixed(1)}%</p>
                                            <p className={`text-sm font-semibold ${confidenceInfo.color}`}>{confidenceInfo.text}</p>
                                        </div>
                                        <div className="w-full grid grid-cols-4 gap-1 mt-2">
                                            <div className="text-center p-2 bg-red-50 rounded-lg"><p className="text-xs font-bold text-red-600">&lt;40%</p><p className="text-[10px] text-gray-500">Rendah</p></div>
                                            <div className="text-center p-2 bg-amber-50 rounded-lg"><p className="text-xs font-bold text-amber-600">40-59%</p><p className="text-[10px] text-gray-500">Sedang</p></div>
                                            <div className="text-center p-2 bg-purple-50 rounded-lg"><p className="text-xs font-bold text-purple-600">60-79%</p><p className="text-[10px] text-gray-500">Tinggi</p></div>
                                            <div className="text-center p-2 bg-green-50 rounded-lg"><p className="text-xs font-bold text-green-600">&ge;80%</p><p className="text-[10px] text-gray-500">Sangat Tinggi</p></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Rekomendasi */}
                        <Card className={`border ${isSuccess ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {isSuccess ? '\uD83D\uDCA1' : '\u26A0\uFE0F'} Rekomendasi
                                </CardTitle>
                                <CardDescription>
                                    {isSuccess
                                        ? 'Berdasarkan analisis data, pasien memiliki peluang keberhasilan pengobatan MDR-TB.'
                                        : 'Berdasarkan analisis data, pasien memiliki risiko kegagalan pengobatan MDR-TB yang perlu diperhatikan.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isSuccess ? (
                                    <>
                                        <div className="p-4 bg-white rounded-lg border border-green-200">
                                            <h4 className="font-semibold text-green-700 mb-2">✅ Faktor Pendukung Keberhasilan</h4>
                                            <ul className="space-y-1">
                                                {positiveFactors.map((f, i) => (
                                                    <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                                            <h4 className="font-semibold text-gray-700 mb-2">📋 Saran Tindak Lanjut</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Pertahankan kepatuhan minum obat sesuai jadwal.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Lakukan kontrol rutin ke fasilitas kesehatan.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Laporkan segera jika terjadi efek samping obat.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Jaga pola hidup sehat dan nutrisi yang cukup.</li>
                                            </ul>
                                        </div>
                                        {riskFactors.length > 0 && (
                                            <div className="p-4 bg-white rounded-lg border border-amber-200">
                                                <h4 className="font-semibold text-amber-700 mb-2">⚠️ Faktor Risiko yang Perlu Diperhatikan</h4>
                                                <ul className="space-y-1">
                                                    {riskFactors.map((f, i) => (
                                                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />{f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 bg-white rounded-lg border border-red-200">
                                            <h4 className="font-semibold text-red-700 mb-2">⚠️ Faktor Risiko Teridentifikasi</h4>
                                            {riskFactors.length > 0 ? (
                                                <ul className="space-y-1">
                                                    {riskFactors.map((f, i) => (
                                                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-gray-600">Tidak ada faktor risiko spesifik yang teridentifikasi.</p>
                                            )}
                                        </div>
                                        <div className="p-4 bg-white rounded-lg border border-gray-200">
                                            <h4 className="font-semibold text-gray-700 mb-2">📋 Rekomendasi Tindakan</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Konsultasikan dengan dokter spesialis paru untuk evaluasi mendalam.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Evaluasi dan tingkatkan kepatuhan minum obat.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Pertimbangkan evaluasi ulang panduan pengobatan.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Perhatikan efek samping obat untuk penanganan dini.</li>
                                                <li className="flex items-start gap-2"><span className="mt-1">•</span> Pastikan dukungan nutrisi dan gaya hidup sehat.</li>
                                            </ul>
                                        </div>
                                        {positiveFactors.length > 0 && (
                                            <div className="p-4 bg-white rounded-lg border border-green-200">
                                                <h4 className="font-semibold text-green-700 mb-2">✅ Faktor Positif yang Dimiliki</h4>
                                                <ul className="space-y-1">
                                                    {positiveFactors.map((f, i) => (
                                                        <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />{f}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                )}
                                <p className="text-xs text-gray-400 italic mt-2">
                                    * Hasil prediksi ini merupakan estimasi berdasarkan model machine learning dan bukan diagnosis medis. Selalu konsultasikan dengan tenaga medis profesional.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Data Pasien */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">📋 Data Pasien</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                                    {Object.entries(data).map(([key, value]) => {
                                        if (key === 'model_name') return null;
                                        // Sembunyikan keterangan_efek_samping jika tidak ada keluhan
                                        if (key === 'keterangan_efek_samping' && data.efek_samping_obat !== '1') return null;
                                        return (
                                            <div key={key} className="flex flex-col border-b border-gray-100 pb-1">
                                                <span className="text-xs text-gray-500 font-medium">{labelMappings[key] || key}</span>
                                                <span className="font-semibold text-gray-800">
                                                    {key === 'nama_lengkap' ? censorName(value || '-') : getDecodedValue(key, value || '-')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* CTA */}
                        <div className="text-center">
                            <a href="/lakukan-prediksi">
                                <Button className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white px-8">
                                    🔮 Lakukan Prediksi Baru
                                </Button>
                            </a>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
}
