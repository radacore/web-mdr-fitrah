import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Prediction {
    id: number;
    prediction_result: string;
    model_used: string;
    confidence_score: number;
    probabilities: { Berhasil: number; 'Tidak Berhasil': number } | null;
    created_at: string;
    patient_data: Record<string, string>;
}

interface FactorContribution {
    feature: string;
    contribution_logit: number;
    contribution_raw?: number;
    coefficient?: number;
    raw_value?: number;
    scaled_value?: number;
    scaled_mean?: number;
    scaled_std?: number;
    delta_pp: number;
}

interface DTPathNode {
    node: number;
    leaf: boolean;
    samples: number;
    class_fraction: number[];
    class_count: number[];
    gini: number;
    feature?: string;
    threshold?: number;
    scaled_value?: number;
    go_left?: boolean;
}

interface TopSVC {
    index: number;
    support_index: number;
    kernel: number;
    dual: number;
    contribution: number;
}

interface ShapAttributionEntry {
    feature: string;
    shap_value: number;
    shap_mean_abs: number;
    raw_value: number;
    scaled_value: number;
}

interface FactorContributions {
    intercept: number;
    base_probability: number;
    probability: number;
    z_raw?: number;
    z_final?: number;
    features: FactorContribution[];
    type?: 'dt' | 'svm';
    path?: DTPathNode[];
    f?: number;
    rho?: number;
    gamma?: number;
    n_support?: number;
    platt_A?: number;
    platt_B?: number;
    A?: number;
    B?: number;
    top_sv?: TopSVC[];
    shap?: {
        method?: string | null;
        background?: string | null;
        base_value?: number | null;
        features?: ShapAttributionEntry[] | null;
    } | null;
}

interface Props {
    prediction: Prediction;
    factorContributions?: FactorContributions | null;
}

export const decodingMappings: Record<string, Record<string, string>> = {
    usia: { '0': 'Usia Produktif', '1': 'Usia Lanjut' },
    ket_usia: { '0': 'Usia Produktif (≤45 thn)', '1': 'Usia Lanjut (>45 thn)' },
    jenis_kelamin: { '0': 'Laki-Laki', '1': 'Perempuan' },
    status_bekerja: { '0': 'Tidak Bekerja', '1': 'Bekerja' },
    status_gizi: { '0': 'Gizi Kurang', '1': 'Gizi Normal', '2': 'Gizi Lebih' },
    status_merokok: { '0': 'Tidak Merokok', '1': 'Merokok' },
    pemeriksaan_kontak: { '0': 'Tidak', '1': 'Ya' },
    riwayat_dm: { '0': 'Tidak', '1': 'Ya' },
    riwayat_hiv: { '0': 'Tidak', '1': 'Ya' },
    komorbiditas: { '0': 'Tidak Ada', '1': 'Ada' },
    kepatuhan_minum_obat: { '0': 'Patuh', '1': 'Tidak Patuh' },
    efek_samping_obat: { '0': 'Tidak Ada Keluhan', '1': 'Ada Keluhan' },
    riwayat_pengobatan: { '0': 'Kasus Baru', '1': 'Kasus Lama' },
    panduan_pengobatan: { '0': 'Jangka Pendek', '1': 'Jangka Panjang' },
};

export const getDecodedValue = (key: string, value: string): string => {
    if (decodingMappings[key] && decodingMappings[key][value] !== undefined) {
        return decodingMappings[key][value];
    }
    return value;
};

export default function Show({ prediction, factorContributions }: Props) {
    const isSuccess = prediction.prediction_result === 'Berhasil';

    // Normalize patient_data keys: convert ML-formatted keys to lowercase form-field keys
    const mlKeyMap: Record<string, string> = {
        'Usia': 'usia', 'Ket.Usia': 'ket_usia', 'Jenis Kelamin': 'jenis_kelamin',
        'Status Bekerja': 'status_bekerja', 'BB': 'bb', 'TB': 'tb', 'IMT': 'imt',
        'Status Gizi': 'status_gizi', 'Status Merokok': 'status_merokok',
        'Pemeriksaan Kontak': 'pemeriksaan_kontak', 'Riwayat_DM': 'riwayat_dm',
        'Riwayat_HIV': 'riwayat_hiv', 'Komorbiditas': 'komorbiditas',
        'Kepatuhan Minum Obat': 'kepatuhan_minum_obat', 'Efek Samping Obat': 'efek_samping_obat',
        'Riwayat Pengobatan Sebelumnya': 'riwayat_pengobatan', 'Panduan Pengobatan': 'panduan_pengobatan',
    };
    const rawData = prediction.patient_data;
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawData)) {
        data[mlKeyMap[key] || key] = value;
    }

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
        keterangan_efek_samping: 'Keterangan Efek Samping',
        riwayat_pengobatan: 'Riwayat Pengobatan',
        panduan_pengobatan: 'Panduan Pengobatan',
    };


    // Build feature vector for display
    const featureOrder = [
        'usia', 'jenis_kelamin', 'status_bekerja', 'status_gizi', 'status_merokok',
        'pemeriksaan_kontak', 'riwayat_dm', 'riwayat_hiv', 'komorbiditas',
        'kepatuhan_minum_obat', 'efek_samping_obat', 'riwayat_pengobatan', 'panduan_pengobatan'
    ];

    const encodedFeatures = featureOrder.map(key => ({
        name: labelMappings[key] || key,
        original: getDecodedValue(key, data[key] || '-'),
        encoded: data[key] || '-'
    }));

    // Pie chart data
    const probabilityData = prediction.probabilities ? [
        { name: 'Berhasil', value: prediction.probabilities.Berhasil ?? 0, fill: '#22c55e' },
        { name: 'Tidak Berhasil', value: prediction.probabilities['Tidak Berhasil'] ?? 0, fill: '#ef4444' },
    ] : [];

    // Peta feature -> delta_pp dari attribusi SHAP (bila tersedia)
    const factorContribMap = new Map<string, number>();
    if (factorContributions?.features) {
        factorContributions.features.forEach(f => { factorContribMap.set(f.feature, f.delta_pp); });
    }
    const hasContrib = factorContribMap.size > 0;

    // Helper: format angka teknis untuk tabel perhitungan
    const fmtNum = (v: number | undefined, digits = 4): string =>
        v === undefined ? '—' : Number(v.toFixed(digits)).toString();
    const signedNum = (v: number | undefined, digits = 4): string =>
        v === undefined ? '0' : `${v >= 0 ? '+' : ''}${Number(v.toFixed(digits)).toString()}`;

    // Nilai fitur sebagai label (decode bila dikenali) + nilai mentah
    const featValueLabel = (f: FactorContribution): string => {
        const formKey = mlKeyMap[f.feature] || f.feature.toLowerCase().replace(/\s+/g, '_');
        const rawNum = Number(f.raw_value);
        const base = Number.isInteger(rawNum) ? String(Math.round(rawNum)) : String(rawNum);
        const decoded = getDecodedValue(formKey, String(Math.round(rawNum)));
        return decoded !== base ? `${decoded} (${base})` : base;
    };

    // True bila data attribusi lengkap utk tabel angka (dari model terbaru)
    const hasDetailCalc = hasContrib && factorContributions?.z_final !== undefined;

    // True bila rincian kalkulasi DT/SVM tersedia dari /explain
    const dtPath = factorContributions?.type === 'dt' ? (factorContributions.path ?? null) : null;
    const dtLeaf = dtPath && dtPath.length ? dtPath[dtPath.length - 1] : null;
    const hasDTCalc = !!dtPath;

    const svmFC = factorContributions?.type === 'svm' ? factorContributions : null;
    const hasSVMCc = !!svmFC && typeof svmFC.f === 'number';
    const svmF = svmFC?.f ?? 0;
    const svmA = svmFC?.A ?? svmFC?.platt_A ?? 0;
    const svmB = svmFC?.B ?? svmFC?.platt_B ?? 0;
    const svmExp = svmB - svmA * svmF;
    const svmProb = 1 / (1 + Math.exp(svmExp));

    // Nilai antara untuk rincian kalkulasi sigmoid
    const zRaw = factorContributions?.z_raw;
    const zFinal = factorContributions?.z_final;
    const expNegZB = zFinal !== undefined ? Math.exp(-zFinal) : 0;
    const denom = expNegZB > 0 ? 1 + expNegZB : 0;
    const invDenom = denom > 0 ? 1 / denom : 0;

    // Risk factors from patient data
    const getRiskFactors = () => {
        const risks: { label: string; key: string }[] = [];
        if (data.kepatuhan_minum_obat === '1') risks.push({ label: 'Tidak patuh minum obat', key: 'kepatuhan_minum_obat' });
        if (data.komorbiditas === '1') risks.push({ label: 'Memiliki komorbiditas', key: 'komorbiditas' });
        if (data.riwayat_dm === '1') risks.push({ label: 'Riwayat diabetes mellitus', key: 'riwayat_dm' });
        if (data.riwayat_hiv === '1') risks.push({ label: 'Riwayat HIV positif', key: 'riwayat_hiv' });
        if (data.efek_samping_obat === '1') risks.push({ label: 'Mengalami efek samping obat', key: 'efek_samping_obat' });
        if (data.status_merokok === '1') risks.push({ label: 'Merokok', key: 'status_merokok' });
        if (data.riwayat_pengobatan === '1') risks.push({ label: 'Kasus pengobatan lama', key: 'riwayat_pengobatan' });
        if (data.usia === '1') risks.push({ label: 'Usia lanjut (>45 tahun)', key: 'usia' });
        return risks;
    };

    const getPositiveFactors = () => {
        const positives: { label: string; key: string }[] = [];
        if (data.kepatuhan_minum_obat === '0') positives.push({ label: 'Patuh minum obat', key: 'kepatuhan_minum_obat' });
        if (data.komorbiditas === '0') positives.push({ label: 'Tidak ada komorbiditas', key: 'komorbiditas' });
        if (data.riwayat_dm === '0') positives.push({ label: 'Tidak ada riwayat DM', key: 'riwayat_dm' });
        if (data.riwayat_hiv === '0') positives.push({ label: 'HIV negatif', key: 'riwayat_hiv' });
        if (data.efek_samping_obat === '0') positives.push({ label: 'Tidak ada efek samping obat', key: 'efek_samping_obat' });
        if (data.status_merokok === '0') positives.push({ label: 'Tidak merokok', key: 'status_merokok' });
        return positives;
    };

    const riskFactors = getRiskFactors();
    const positiveFactors = getPositiveFactors();

    // Render item faktor
    const renderFactor = (f: { label: string; key: string }, dotClass: string) => {
        return (
            <li className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
                <span>{f.label}</span>
            </li>
        );
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Riwayat', href: '/prediction/history' }, { label: `Detail #${prediction.id}` }]}>
            <Head title={`Detail Prediksi #${prediction.id}`} />

            <div className="space-y-6">
                {/* Header Card - Hasil Prediksi */}
                <Card className={`border-2 overflow-hidden ${isSuccess ? 'border-green-500' : 'border-red-500'}`}>
                    <CardHeader className={isSuccess ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}>
                        <CardTitle className="text-center text-2xl">
                            {isSuccess ? '✅' : '❌'} Prediksi: {prediction.prediction_result}
                        </CardTitle>
                        <CardDescription className="text-center">
                            Dianalisis pada {new Date(prediction.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} menggunakan model <strong>{prediction.model_used}</strong>
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Grafik & Rekomendasi Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Doughnut Chart - Probabilitas */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg">📊 Grafik Probabilitas</CardTitle>
                            <CardDescription>Perbandingan visual peluang hasil pengobatan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {prediction.probabilities ? (
                                <div className="flex flex-col items-center">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={probabilityData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {probabilityData.map((entry) => (
                                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toFixed(1)}%`} />
                                            <Legend
                                                verticalAlign="bottom"
                                                formatter={(value: string) => <span className="text-sm font-medium">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="grid grid-cols-2 gap-4 w-full mt-2">
                                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                            <p className="text-2xl font-bold text-green-600">{prediction.probabilities.Berhasil?.toFixed(1)}%</p>
                                            <p className="text-xs text-gray-500">Berhasil</p>
                                        </div>
                                        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                            <p className="text-2xl font-bold text-red-600">{prediction.probabilities['Tidak Berhasil']?.toFixed(1)}%</p>
                                            <p className="text-xs text-gray-500">Tidak Berhasil</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500">Data probabilitas tidak tersedia</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Rekomendasi */}
                    <Card className={`h-full border ${isSuccess ? 'border-green-200 bg-green-50/50 dark:bg-green-950/30' : 'border-red-200 bg-red-50/50 dark:bg-red-950/30'}`}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {isSuccess ? '💡' : '⚠️'} Rekomendasi
                            </CardTitle>
                            <CardDescription>
                                {isSuccess
                                    ? 'Berdasarkan analisis data, pasien memiliki peluang keberhasilan pengobatan MDR-TB.'
                                    : 'Berdasarkan analisis data, pasien memiliki risiko kegagalan pengobatan MDR-TB yang perlu diperhatikan.'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isSuccess ? (
                                <>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-green-200">
                                        <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">✅ Faktor Pendukung Keberhasilan</h4>
                                        <ul className="space-y-1">
                                            {positiveFactors.map(f => (
                                                renderFactor(f, 'bg-green-500')
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📋 Saran Tindak Lanjut</h4>
                                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Pertahankan kepatuhan minum obat sesuai jadwal yang ditentukan.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Lakukan kontrol rutin ke fasilitas kesehatan sesuai jadwal.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Laporkan segera jika terjadi efek samping obat.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Jaga pola hidup sehat dan nutrisi yang cukup.</li>
                                        </ul>
                                    </div>
                                    {riskFactors.length > 0 && (
                                        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-200">
                                            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ Faktor Risiko yang Perlu Diperhatikan</h4>
                                            <ul className="space-y-1">
                                                {riskFactors.map(f => (
                                                    renderFactor(f, 'bg-amber-500')
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
                                        <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ Faktor Risiko Teridentifikasi</h4>
                                        {riskFactors.length > 0 ? (
                                            <ul className="space-y-1">
                                                {riskFactors.map(f => (
                                                    renderFactor(f, 'bg-red-500')
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-600">Tidak ada faktor risiko spesifik yang teridentifikasi dari data yang tersedia.</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200">
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📋 Rekomendasi Tindakan</h4>
                                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Konsultasikan hasil prediksi ini dengan dokter spesialis paru untuk evaluasi mendalam.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Evaluasi dan tingkatkan kepatuhan minum obat secara ketat.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Pertimbangkan evaluasi ulang panduan pengobatan yang digunakan.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Perhatikan dan laporkan efek samping obat untuk penanganan dini.</li>
                                            <li className="flex items-start gap-2"><span className="mt-1">•</span> Pastikan dukungan nutrisi dan gaya hidup sehat selama pengobatan.</li>
                                        </ul>
                                    </div>
                                    {positiveFactors.length > 0 && (
                                        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-green-200">
                                            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">✅ Faktor Positif yang Dimiliki</h4>
                                            <ul className="space-y-1">
                                                {positiveFactors.map(f => (
                                                    renderFactor(f, 'bg-green-500')
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                            <p className="text-xs text-gray-400 italic mt-2">
                                * Hasil prediksi ini merupakan estimasi berdasarkan model machine learning dan bukan diagnosis medis. Selalu konsultasikan dengan tenaga medis medis profesional.
                            </p>
                        </CardContent>
                    </Card>
                </div>


                {/* Analisis Kontribusi Fitur & Rincian Angka Perhitungan */}
                <Card className="overflow-hidden">
                    <details className="group" open>
                        <summary className="flex cursor-pointer items-center justify-between p-6 m-0 font-semibold list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <div className="flex items-center gap-2">
                                🔍 Analisis Kontribusi Fitur & Rincian Angka
                            </div>
                            <div className="transition-transform duration-300 group-open:rotate-180">
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            </div>
                        </summary>
                        <CardContent className="pt-0 border-t mt-2 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Rincian bagaimana model menentukan hasil prediksi untuk pasien ini — nilai, bobot, dan kontribusi tiap fitur.
                            </p>
                                {hasDetailCalc && factorContributions && (
                                    <div className="p-4 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 space-y-3">
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            📐 Rincian Angka Perhitungan (Logistic Regression)
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Nilai dirumuskan pasien diubah jadi skor standar
                                            <InlineMath math="z_i = \frac{x_i - \mu_i}{\sigma_i}" />, lalu di jumlah terkali koefisien model
                                            <InlineMath math="\beta_i" />. Total <InlineMath math="z" /> dipasang ke fungsi sigmoid hingga menjadi persentase.
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs border-collapse text-slate-700 dark:text-slate-300">
                                                <thead>
                                                    <tr className="bg-slate-100 dark:bg-slate-800">
                                                        <th className="border p-2 text-left">Fitur</th>
                                                        <th className="border p-2 text-left">Nilai (<InlineMath math="x_i" />)</th>
                                                        <th className="border p-2 text-center">Nilai z</th>
                                                        <th className="border p-2 text-center">Koefisien (<InlineMath math="\beta" />)</th>
                                                        <th className="border p-2 text-center"><InlineMath math="\beta \cdot z" /></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {factorContributions.features.map((f) => (
                                                        <tr key={f.feature} className="odd:bg-slate-50 dark:odd:bg-slate-800/50">
                                                            <td className="border p-2 text-left font-medium">{f.feature}</td>
                                                            <td className="border p-2 text-left">{featValueLabel(f)}</td>
                                                            <td className="border p-2 font-mono">{fmtNum(f.scaled_value)}</td>
                                                            <td className="border p-2 font-mono">{fmtNum(f.coefficient)}</td>
                                                            <td className="border p-2 font-mono">{fmtNum(f.contribution_raw)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                                                        <td className="border p-2" colSpan={4}>
                                                            Total logit mentah{' '}
                                                            <InlineMath
                                                                math={`z = ${fmtNum(factorContributions.intercept)} ${factorContributions.features.map(f => signedNum(f.contribution_raw)).join(' ')}`}
                                                            />
                                                        </td>
                                                        <td className="border p-2 text-center">{fmtNum(factorContributions.z_raw)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-3">
                                            <div className="space-y-1">
                                                <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">① Jumlahkan logit mentah</p>
                                                <p>
                                                    z = β₀ + Σ(βᵢ·zᵢ) = {fmtNum(factorContributions.intercept)}{factorContributions.features.map(f => signedNum(f.contribution_raw)).join('')}
                                                </p>
                                                <p className="pl-1">
                                                    z = {fmtNum(zRaw)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">② Ubah orientasi ke kelas «Berhasil»</p>
                                                <p>
                                                    Kelas «Berhasil» berada di sisi negatif logit mentah, sehingga:
                                                </p>
                                                <p className="pl-1">
                                                    z<sub>Berhasil</sub> = −z = −({fmtNum(zRaw)}) = {fmtNum(zFinal)}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">③ Fungsi sigmoid → probabilitas</p>
                                                <p className="pl-1">a) P(Berhasil) = 1 / (1 + e<sup>−z<sub>Berhasil</sub></sup>)</p>
                                                <p className="pl-1">
                                                    b) e<sup>−z<sub>Berhasil</sub></sup> = e<sup>{fmtNum(zFinal !== undefined ? -zFinal : 0)}</sup> = {fmtNum(expNegZB)}
                                                </p>
                                                <p className="pl-1">
                                                    c) P(Berhasil) = 1 / (1 + {fmtNum(expNegZB)}) = 1 / {fmtNum(denom)} ≈ {fmtNum(invDenom)}
                                                </p>
                                                <p className="pl-1 font-bold text-green-600">
                                                    d) P(Berhasil) = {factorContributions.probability.toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            * z = (x−μ)/σ adalah standardisasi; μ &amp; σ diambil dari data latih. Nilai dapat dibulatkan sehingga
                                            penjumlahan manual bisa sedikit berbeda dari hasil model.
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            * <strong>Ket.Usia</strong> adalah umur pasien dalam tahun (variabel numerik), bukan kode berlabel.
                                            Itulah sebabnya kolom "Nilai (x)" menampilkan angka umur (mis. 29 tahun), sementara fitur lain
                                            menampilkan kode 0/1 karena bersifat kategorikal.
                                        </p>
                                    </div>
                                )}
                                {hasDTCalc && (
                                    <div className="p-4 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 space-y-3">
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            🌳 Rincian Angka Perhitungan (Decision Tree)
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Pasien menelusuri satu jalur dari <em>root</em> ke <em>leaf</em>. Ambang split &amp; nilai fitur
                                            ditampilkan dalam skala z (hasil <InlineMath math="StandardScaler" />). Di simpul daun,
                                            probabilitas prediksi diambil dari komposisi kelas sampel latih.
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs border-collapse text-slate-700 dark:text-slate-300">
                                                <thead>
                                                    <tr className="bg-slate-100 dark:bg-slate-800">
                                                        <th className="border p-2 text-left">Node</th>
                                                        <th className="border p-2 text-left">Aturan (fitur ≤ ambang)</th>
                                                        <th className="border p-2 text-center">Nilai z</th>
                                                        <th className="border p-2 text-center">Gini</th>
                                                        <th className="border p-2 text-center">Sampel</th>
                                                        <th className="border p-2 text-center">Berhasil / Tidak</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dtPath?.map((n) => (
                                                        n.leaf ? (
                                                            <tr key={`leaf-${n.node}`} className="bg-emerald-50 dark:bg-emerald-950/40 font-semibold">
                                                                <td className="border p-2">{n.node} (daun)</td>
                                                                <td className="border p-2" colSpan={3}>Leaf node</td>
                                                                <td className="border p-2 text-center">{n.samples}</td>
                                                                <td className="border p-2 text-center">
                                                                    {(n.class_fraction[0] * 100).toFixed(1)}% / {(n.class_fraction[1] * 100).toFixed(1)}%
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            <tr key={`split-${n.node}`}>
                                                                <td className="border p-2">{n.node}</td>
                                                                <td className="border p-2">{n.feature} ≤ {fmtNum(n.threshold)}</td>
                                                                <td className="border p-2 text-center font-mono">{fmtNum(n.scaled_value)}</td>
                                                                <td className="border p-2 text-center font-mono">{fmtNum(n.gini)}</td>
                                                                <td className="border p-2 text-center">{n.samples}</td>
                                                                <td className="border p-2 text-center">
                                                                    {(n.class_fraction[0] * 100).toFixed(1)}% / {(n.class_fraction[1] * 100).toFixed(1)}%
                                                                </td>
                                                            </tr>
                                                        )
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {dtLeaf && (
                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs font-mono space-y-1">
                                                <p>
                                                    P(Berhasil) = {dtLeaf.class_count[0]}/{dtLeaf.samples} ≈ {(dtLeaf.class_fraction[0] * 100).toFixed(2)}%
                                                </p>
                                                <p className="text-slate-400">
                                                    * Sampel dihitung dengan bobot <InlineMath>class_weight="balanced"</InlineMath>.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {hasSVMCc && (
                                    <div className="p-4 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 space-y-3">
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            🎯 Rincian Angka Perhitungan (Support Vector Machine)
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Nilai keputusan <InlineMath math="f(x)" /> dihitung dari bobot support vector pada kernel RBF,
                                            lalu dikonversi ke probabilitas melalui <em>Platt scaling</em>.
                                        </p>
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-3">
                                            <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">① Fungsi keputusan f(x)</p>
                                            <div className="space-y-1 pl-2">
                                                <p>
                                                    <InlineMath math="f(x) = \sum_i \alpha_i y_i K(x_i, x) + \rho" />
                                                </p>
                                                <p>
                                                    Σ αᵢyᵢK(xᵢ,x) = f(x) − ρ = {fmtNum(svmF, 6)} − {fmtNum(svmFC.rho, 4)} = <span className="font-bold">{fmtNum(svmF - (svmFC.rho ?? 0), 6)}</span>
                                                </p>
                                                <p>
                                                    ρ (bias) = {fmtNum(svmFC.rho, 4)} · jumlah SV = {svmFC.n_support || '—'}
                                                </p>
                                                <p>
                                                    f(x) = {fmtNum(svmF - (svmFC.rho ?? 0), 6)} + {fmtNum(svmFC.rho, 4)} = <span className="font-bold">{fmtNum(svmF, 6)}</span>
                                                </p>
                                                <p className="text-slate-400">
                                                    f(x) negatif → pasien berada di sisi negatif hyperplane (arah kelas «Tidak Berhasil»); namun probabilitas final ditentukan Platt scaling di bawah.
                                                </p>
                                            </div>
                                            <p className="font-sans font-semibold text-slate-600 dark:text-slate-200 pt-1">② Kernel RBF</p>
                                            <div className="space-y-1 pl-2">
                                                <p>
                                                    <InlineMath math="K(x_i,x) = e^{-\gamma \|x_i - x\|^2}" /> dengan <InlineMath math="\gamma = 1/7 \approx" /> {fmtNum(svmFC.gamma, 4)}
                                                </p>
                                                <p className="text-slate-400">
                                                    Mengukur kemiripan pasien ini (x) dengan tiap pasien masa lalu (xᵢ): makin dekat jaraknya, makin besar K → makin besar kontribusinya ke f(x).
                                                </p>
                                            </div>
                                            <p className="font-sans font-semibold text-slate-600 dark:text-slate-200 pt-1">③ Platt scaling → probabilitas</p>
                                            <div className="space-y-1 pl-2">
                                                <p>
                                                    <InlineMath math="P(\text{Berhasil}) = \frac{1}{1 + e^{\,B - A\,f(x)}}" />
                                                </p>
                                                <p>
                                                    A = {fmtNum(svmA, 4)} · B = {fmtNum(svmB, 4)}
                                                </p>
                                                <p>
                                                    A·f(x) = {fmtNum(svmA, 4)} · ({fmtNum(svmF, 6)}) = {fmtNum(svmA * svmF, 6)}
                                                </p>
                                                <p>
                                                    B − A·f(x) = {fmtNum(svmB, 4)} − {fmtNum(svmA * svmF, 6)} = <span className="font-bold">{fmtNum(svmExp, 6)}</span>
                                                </p>
                                                <p>
                                                    e<sup>{fmtNum(svmExp, 4)}</sup> = {fmtNum(Math.exp(svmExp), 6)}
                                                </p>
                                                <p>
                                                    P(Berhasil) = 1 / (1 + {fmtNum(Math.exp(svmExp), 6)}) = <span className="font-bold text-green-600">{fmtNum(svmProb, 4)} ≈ {(svmProb * 100).toFixed(2)}%</span>
                                                </p>
                                                <p>
                                                    P(Tidak Berhasil) = 1 − {fmtNum(svmProb, 4)} = {(1 - svmProb) * 100 < 0 ? '0.00' : ((1 - svmProb) * 100).toFixed(2)}%
                                                </p>
                                            </div>
                                            {svmFC.shap?.features && svmFC.shap.features.length > 0 && svmFC.shap.base_value != null && (
                                                <div className="space-y-1 pt-1">
                                                    <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">④ Menuju Baseline & Waterfall (SHAP)</p>
                                                    <div className="space-y-1 pl-2">
                                                        <p>
                                                            SHAP memecah P(Berhasil) menjadi <span className="font-bold">baseline + Σ kontribusi fitur (φ)</span>.
                                                        </p>
                                                        <p>
                                                            Baseline = {fmtNum(svmFC.shap.base_value * 100, 2)}% → rata-rata P(Berhasil) model pada data background ({svmFC.shap.background ?? '—'}).
                                                        </p>
                                                        {(() => {
                                                            const targetPct = prediction.probabilities?.Berhasil ?? 0;
                                                            const sumPhi = svmFC.shap.features.reduce((s, f) => s + f.shap_value, 0);
                                                            const activePct = (svmFC.shap.base_value + sumPhi) * 100;
                                                            return (
                                                                <>
                                                                    <p>
                                                                        Baseline + Σ φ = {fmtNum(svmFC.shap.base_value * 100, 2)}% + {sumPhi * 100 >= 0 ? '+' : ''}{fmtNum(sumPhi * 100, 2)}% = <span className="font-bold">{fmtNum(activePct, 2)}%</span> (model aktif).
                                                                    </p>
                                                                    {targetPct > 0 && Math.abs(activePct - targetPct) > 0.05 && (
                                                                        <p className="text-slate-400">
                                                                            Karena prediksi tersimpan ({targetPct.toFixed(2)}%) dihitung model sebelum dilatih ulang, kontribusi di bawah dikalibrasi agar total waterfall pas {targetPct.toFixed(2)}%.
                                                                        </p>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {svmFC.shap?.features && svmFC.shap.features.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    Atribusi SHAP per fitur (KernelExplainer — exact SHAP, 2^M koalisi):
                                                </p>
                                                {svmFC.shap.base_value != null && (
                                                    <p className="text-[11px] text-slate-400">
                                                        Baseline P(Berhasil) = {fmtNum(svmFC.shap.base_value * 100, 2)}% · background: {svmFC.shap.background ?? '—'}
                                                    </p>
                                                )}
                                                {svmFC.shap.base_value != null && (
                                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                                                        <p className="font-sans font-semibold text-slate-600 dark:text-slate-200">
                                                            Waterfall kontribusi (persen):
                                                        </p>
                                                        {(() => {
                                                            const targetPct = prediction.probabilities?.Berhasil ?? 0;
                                                            const base = svmFC.shap.base_value ?? 0;
                                                            const sumPhi = svmFC.shap.features.reduce((s, f) => s + f.shap_value, 0);
                                                            const activePct = (base + sumPhi) * 100;
                                                            const scale = sumPhi !== 0 ? (targetPct / 100 - base) / sumPhi : 1;
                                                            const scaledPhi = svmFC.shap.features.map(f => ({ ...f, shap_value: f.shap_value * scale }));
                                                            const maxAbs = Math.max(...scaledPhi.map(f => Math.abs(f.shap_value) * 100), 0.0001);
                                                            const totalPct = base * 100 + scaledPhi.reduce((s, f) => s + f.shap_value, 0) * 100;
                                                            return (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-44 shrink-0 text-right text-slate-400 pr-2">Baseline</span>
                                                                        <div className="flex-1 h-5 rounded bg-slate-200 dark:bg-slate-700 px-2 flex items-center justify-end min-w-[70px]">
                                                                            <span className="text-slate-600 dark:text-slate-300">{fmtNum(base * 100, 2)}%</span>
                                                                        </div>
                                                                        <span className="w-16 shrink-0 text-left pl-1">{fmtNum(base * 100, 2)}%</span>
                                                                    </div>
                                                                    {scaledPhi.map((sf) => {
                                                                        const dp = sf.shap_value * 100;
                                                                        const width = Math.max(4, Math.min(100, (Math.abs(dp) / maxAbs) * 100));
                                                                        return (
                                                                            <div key={`wf-${sf.feature}`} className="flex items-center gap-2">
                                                                                <span className="w-44 shrink-0 text-right pr-2 truncate text-slate-600 dark:text-slate-300" title={sf.feature}>{sf.feature}</span>
                                                                                <div className="flex-1 h-5 rounded bg-gray-100 dark:bg-gray-800">
                                                                                    <div
                                                                                        className={`h-5 rounded flex items-center px-1.5 text-[10px] font-bold text-white ${dp >= 0 ? 'bg-green-500 justify-start' : 'bg-red-500 justify-end'}`}
                                                                                        style={{ width: `${width}%` }}
                                                                                    >
                                                                                        {dp >= 0 ? '+' : ''}{fmtNum(dp, 2)}%
                                                                                    </div>
                                                                                </div>
                                                                                <span className={`w-16 shrink-0 text-left pl-1 font-mono ${dp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                    {dp >= 0 ? '+' : ''}{fmtNum(dp, 2)}%
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <div className="flex items-center gap-2 border-t border-slate-300 pt-1">
                                                                        <span className="w-44 shrink-0 text-right pr-2 text-slate-600 dark:text-slate-300 font-semibold">Total</span>
                                                                        <div className="flex-1 h-6 rounded bg-slate-700 dark:bg-slate-300 px-2 flex items-center justify-end min-w-[70px]">
                                                                            <span className="text-white dark:text-slate-800 font-bold">{fmtNum(totalPct, 2)}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 pt-1">
                                                                        ≈ {fmtNum(base * 100, 2)}% {scaledPhi.reduce((s, f) => s + f.shap_value, 0) * 100 >= 0 ? '+' : ''}{fmtNum(scaledPhi.reduce((s, f) => s + f.shap_value, 0) * 100, 2)}%
                                                                    </p>
                                                                    {Math.abs(activePct - targetPct) > 0.05 && (
                                                                        <p className="text-[11px] text-slate-400">
                                                                            * Kontribusi dikalibrasi terhadap probabilitas tersimpan prediksi
                                                                            (model aktif memberi {fmtNum(activePct, 2)}%).
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs border-collapse text-slate-700 dark:text-slate-300">
                                                        <thead>
                                                            <tr className="bg-slate-100 dark:bg-slate-800">
                                                                <th className="border p-2 text-left">Fitur</th>
                                                                <th className="border p-2 text-center">Nilai (x)</th>
                                                                <th className="border p-2 text-center">z</th>
                                                                <th className="border p-2 text-center">SHAP value (φ)</th>
                                                                <th className="border p-2 text-center">|φ|</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {svmFC.shap.features.map((sf) => (
                                                                <tr key={sf.feature} className="odd:bg-slate-50 dark:odd:bg-slate-800/50">
                                                                    <td className="border p-2 text-left font-medium">{sf.feature}</td>
                                                                    <td className="border p-2 text-center font-mono">{fmtNum(sf.raw_value)}</td>
                                                                    <td className="border p-2 text-center font-mono">{fmtNum(sf.scaled_value)}</td>
                                                                    <td className="border p-2 text-center font-mono">{fmtNum(sf.shap_value)}</td>
                                                                    <td className="border p-2 text-center font-mono">{fmtNum(sf.shap_mean_abs)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                        </CardContent>
                    </details>
                </Card>

                {/* Data Pasien */}
                <Card className="overflow-hidden">
                    <details className="group">
                        <summary className="flex cursor-pointer items-center justify-between p-6 m-0 font-semibold list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <div className="flex items-center gap-2">
                                📋 Data Pasien
                            </div>
                            <div className="transition-transform duration-300 group-open:rotate-180">
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            </div>
                        </summary>
                        <CardContent className="pt-0 border-t mt-2">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-4">
                                {Object.entries(prediction.patient_data).map(([key, value]) => {
                                    if (key === 'model_name') return null;
                                    return (
                                        <div key={key} className="flex flex-col border-b border-gray-100 pb-1">
                                            <span className="text-xs text-gray-500 font-medium">
                                                {labelMappings[key] || key}
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                                {getDecodedValue(key, value || '-')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </details>
                </Card>

                {/* Perhitungan Manual */}
                <Card>
                    <CardHeader>
                        <CardTitle>📐 Perhitungan Manual</CardTitle>
                        <CardDescription>
                            Penjelasan langkah demi langkah bagaimana prediksi dihitung menggunakan data pasien
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* Step 1: Preprocessing - Label Encoding */}
                        <details className="group border rounded-lg overflow-hidden" open>
                            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                <span className="flex items-center gap-2 text-lg">
                                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                                    Preprocessing: Label Encoding
                                </span>
                                <span className="transition-transform duration-300 group-open:rotate-180">
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                </span>
                            </summary>
                            <div className="p-4 pt-2 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Data kategorikal dikonversi menjadi nilai numerik menggunakan Label Encoding.
                                Setiap kategori unik diberi nilai integer.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            <th className="border p-2 text-left">Fitur</th>
                                            <th className="border p-2 text-left">Nilai Asli</th>
                                            <th className="border p-2 text-center">→</th>
                                            <th className="border p-2 text-left">Nilai Encoded</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {encodedFeatures.map((feature, idx) => (
                                            <tr key={feature.name} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                                                <td className="border p-2 font-medium">{feature.name}</td>
                                                <td className="border p-2 text-purple-600 dark:text-purple-400">{feature.original}</td>
                                                <td className="border p-2 text-center">→</td>
                                                <td className="border p-2 font-mono font-bold text-green-600 dark:text-green-400">
                                                    <InlineMath math={`x_{${idx + 1}} = ${feature.encoded}`} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            </div>
                        </details>

                        {/* Step 2: Feature Vector */}
                        <details className="group border rounded-lg overflow-hidden">
                            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                <span className="flex items-center gap-2 text-lg">
                                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                                    Pembentukan Feature Vector
                                </span>
                                <span className="transition-transform duration-300 group-open:rotate-180">
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                </span>
                            </summary>
                            <div className="p-4 pt-2 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Nilai-nilai yang sudah di-encode digabungkan menjadi vektor fitur:
                            </p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                <BlockMath math={`\\mathbf{X} = \\begin{bmatrix} ${encodedFeatures.map(f => f.encoded).join(' & ')} \\end{bmatrix}`} />
                            </div>
                            </div>
                        </details>

                        {/* Step 3 and 4 Grid: Model Calculation and Metrics */}
                        <details className="group border rounded-lg overflow-hidden">
                            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                                <span className="flex items-center gap-2 text-lg">
                                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                                    Perhitungan Model, Metrik & Validasi
                                </span>
                                <span className="transition-transform duration-300 group-open:rotate-180">
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                </span>
                            </summary>
                            <div className="p-4 pt-2">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Step 3: Model-specific calculations */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                                    Perhitungan Model: {prediction.model_used}
                                </h4>

                                {prediction.model_used === 'Logistic Regression' && (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                                            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                                                <strong>Logistic Regression</strong> menggunakan fungsi sigmoid untuk mengubah
                                                kombinasi linear fitur menjadi probabilitas.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">a) Hitung nilai linear z:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="z = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_n x_n" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Dimana <InlineMath math="\beta_0" /> adalah intercept dan <InlineMath math="\beta_i" /> adalah koefisien untuk fitur ke-i.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">b) Terapkan fungsi sigmoid:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="P(Y=1|X) = \sigma(z) = \frac{1}{1 + e^{-z}}" />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">c) Keputusan klasifikasi:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="\hat{y} = \begin{cases} \text{Berhasil} & \text{jika } P(Y=1|X) \geq 0.5 \\ \text{Tidak Berhasil} & \text{jika } P(Y=1|X) < 0.5 \end{cases}" />
                                            </div>
                                        </div>

                                        {hasDetailCalc && factorContributions && (
                                            <div className="space-y-3">
                                                <p className="font-medium">d) Substitusi dengan angka pasien ini:</p>
                                                <p className="text-xs text-gray-500">
                                                    Nilai tiap fitur di-standarisasi (z-skor) lalu dikali koefisien model. Kelas
                                                    «Berhasil» berada di sisi negatif logit, sehingga probabilitasnya dihitung
                                                    dari −z.
                                                </p>
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm">
                                                    <BlockMath
                                                        math={`z = ${fmtNum(factorContributions.intercept)} ${factorContributions.features.map(f => signedNum(f.contribution_raw)).join(' ')} = ${fmtNum(factorContributions.z_raw)}`}
                                                    />
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm">
                                                    <BlockMath
                                                        math={`P(\\text{Berhasil}) = \\frac{1}{1+e^{${fmtNum(factorContributions.z_final)}}} = ${(factorContributions.probability / 100).toFixed(4)} = ${factorContributions.probability.toFixed(1)}\\%`}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {prediction.probabilities && (
                                            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                                                <p className="font-medium text-green-800 dark:text-green-200 mb-2">Hasil Perhitungan:</p>
                                                <BlockMath math={`P(\\text{Berhasil}) = ${(prediction.probabilities.Berhasil / 100).toFixed(4)} = ${prediction.probabilities.Berhasil.toFixed(1)}\\%`} />
                                                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                                                    Karena <InlineMath math={`${(prediction.probabilities.Berhasil / 100).toFixed(4)} ${prediction.probabilities.Berhasil >= 50 ? '\\geq' : '<'} 0.5`} />,
                                                    maka prediksi = <strong>{prediction.prediction_result}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {prediction.model_used === 'Decision Tree' && (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                                            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                                                <strong>Decision Tree</strong> membuat keputusan berdasarkan serangkaian
                                                pertanyaan if-then pada fitur data.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">a) Perhitungan Entropy (ketidakmurnian data):</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="Entropy(S) = -\sum_{i=1}^{c} p_i \log_2(p_i)" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Dimana <InlineMath math="p_i" /> adalah proporsi kelas ke-i dalam dataset S.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">b) Information Gain untuk pemilihan split:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="Gain(S, A) = Entropy(S) - \sum_{v \in Values(A)} \frac{|S_v|}{|S|} Entropy(S_v)" />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">c) Proses Klasifikasi:</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Data pasien mengikuti percabangan pohon dari root node hingga leaf node:
                                            </p>
<div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg text-sm">
                                                <pre className="whitespace-pre-wrap">
                                                    {`IF Kepatuhan Minum Obat = "${data.kepatuhan_minum_obat}"
   AND Efek Samping = "${data.efek_samping_obat}"
   AND Riwayat Pengobatan = "${data.riwayat_pengobatan}"
   ...
THEN Prediksi = ${prediction.prediction_result}`}
                                                </pre>
                                            </div>
                                        </div>

                                        {hasDTCalc && dtPath && (
                                            <div className="space-y-3">
                                                <p className="font-medium">d) Jalur pohon pasien ini (angka nyata):</p>
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm">
                                                    <div className="space-y-1.5">
                                                        {dtPath.map((n) => (
                                                            n.leaf ? (
                                                                <p key={`mleaf-${n.node}`} className="text-green-600 font-semibold">
                                                                    → Leaf {n.node}: P(Berhasil) = {n.class_count[0]}/{n.samples} ≈ {(n.class_fraction[0] * 100).toFixed(2)}%
                                                                </p>
                                                            ) : (
                                                                <p key={`msplit-${n.node}`}>
                                                                    {n.feature} ≤ {fmtNum(n.threshold)} (z pasien = {fmtNum(n.scaled_value)}) → {n.go_left ? 'kiri ✓' : 'kanan'}
                                                                </p>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {prediction.model_used === 'K-Nearest Neighbor' && (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                                            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                                                <strong>K-Nearest Neighbor (KNN)</strong> mengklasifikasikan data berdasarkan
                                                kelas mayoritas dari K tetangga terdekat.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">a) Hitung jarak Euclidean ke setiap data training:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="d(p, q) = \sqrt{\sum_{i=1}^{n} (p_i - q_i)^2}" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Dimana p adalah data baru dan q adalah data training.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">b) Contoh perhitungan untuk data pasien ini:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math={`d = \\sqrt{(${encodedFeatures[0].encoded} - q_1)^2 + (${encodedFeatures[1].encoded} - q_2)^2 + \\cdots}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">c) Voting Mayoritas dari K tetangga terdekat:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="\hat{y} = \text{mode}(y_1, y_2, \ldots, y_K)" />
                                            </div>
                                        </div>

                                        {prediction.probabilities && (
                                            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                                                <p className="font-medium text-green-800 dark:text-green-200 mb-2">Hasil Voting:</p>
                                                <p className="text-sm text-green-700 dark:text-green-300">
                                                    Dari K tetangga terdekat, {prediction.probabilities.Berhasil.toFixed(1)}% memprediksi "Berhasil"
                                                    dan {prediction.probabilities['Tidak Berhasil'].toFixed(1)}% memprediksi "Tidak Berhasil".
                                                </p>
                                                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                                                    Mayoritas = <strong>{prediction.prediction_result}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {prediction.model_used === 'Support Vector Machine' && (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                                            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                                                <strong>Support Vector Machine (SVM)</strong> mencari hyperplane optimal
                                                yang memisahkan dua kelas dengan margin maksimal.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">a) Fungsi keputusan hyperplane:</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="f(x) = \mathbf{w} \cdot \mathbf{x} + b" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Dimana <InlineMath math="\mathbf{w}" /> adalah vektor bobot dan b adalah bias.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">a) Fungsi kernel RBF (Radial Basis Function):</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="K(x_i, x) = \exp(-\gamma \|x_i - x\|^2)" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                SVM pada sistem ini menggunakan kernel RBF (<InlineMath math="\gamma = \text{scale}" />) yang mengukur jarak (kemiripan) antara data pasien baru (<InlineMath math="x" />) dengan data-data penderita TB sebelumnya (<InlineMath math="x_i" />).
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">b) Menghitung nilai keputusan (Decision Function <InlineMath math="f(x)" />):</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Nilai ini dihitung berdasarkan jumlah perkalian bobot setiap Support Vector (pasien masa lalu yang relevan) dengan nilai kernelnya:
                                            </p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="f(x) = \sum_{i=1}^{N_{sv}} \alpha_i y_i K(x_i, x) + b" />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Dimana <InlineMath math="\alpha_i" /> adalah koefisien bobot tiap Support Vector, <InlineMath math="y_i" /> adalah kelas (0 atau 1), dan <InlineMath math="b" /> adalah bias/intercept model.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">c) Substitusi Angka pada Data Pasien Ini:</p>
                                            {hasSVMCc ? (
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm space-y-1.5">
                                                    <p>f(x) = Σ αᵢ·yᵢ·K(xᵢ, x) + ρ = {fmtNum(svmF, 6)}</p>
                                                    <p className="pl-4">ρ = {fmtNum(svmFC.rho)} · jumlah SV = {svmFC.n_support || '—'}</p>
                                                    <p>Kernel RBF: γ = 1/7 ≈ {fmtNum(svmFC.gamma)}</p>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                                                    <BlockMath math={`f(x) = \\left( \\alpha_1 K(x_1, [${encodedFeatures.slice(0, 3).map(f => f.encoded).join(', ')}...]) \\right) + \\cdots + b`} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <p className="font-medium">d) Klasifikasi & Probabilitas (Platt Scaling):</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                                <BlockMath math="P(Y=1|X) = \frac{1}{1 + \exp(A \cdot f(x) + B)}" />
                                            </div>
                                            {hasSVMCc && (
                                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto font-mono text-sm space-y-1.5">
                                                    <p>A = {fmtNum(svmA)} · f(x) = {fmtNum(svmF, 6)} · B = {fmtNum(svmB)}</p>
                                                    <p>A·f(x) + B = {fmtNum(svmExp)}</p>
                                                    <p>
                                                        P(Berhasil) = 1/(1 + e<sup>−({fmtNum(svmExp)})</sup>) = 1/(1 + e<sup>{fmtNum(-svmExp)}</sup>) ≈ {fmtNum(svmProb, 6)}
                                                    </p>
                                                    <p className="font-semibold text-green-600">
                                                        → {(svmProb * 100).toFixed(2)}%
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500">
                                                Nilai jarak dari garis batas (hyperplane) <InlineMath math="f(x)" /> dikonversi menjadi persentase probabilitas menggunakan metode Platt Scaling.
                                            </p>
                                        </div>

                                        {prediction.probabilities && (
                                            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                                                <p className="font-medium text-green-800 dark:text-green-200 mb-2">Hasil Akhir Perhitungan:</p>
                                                <BlockMath math={`P(\\text{Berhasil}) = ${prediction.probabilities.Berhasil.toFixed(1)}\\%`} />
                                                <BlockMath math={`P(\\text{Tidak Berhasil}) = ${prediction.probabilities['Tidak Berhasil'].toFixed(1)}\\%`} />
                                                <p className="text-sm text-green-700 dark:text-green-300 mt-2 border-t border-green-200 pt-2">
                                                    Karena peluang {prediction.prediction_result} lebih dominan, maka status pasien diprediksi: <strong>{prediction.prediction_result}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Step 4: Metrik Evaluasi */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                                    Metrik Evaluasi Model
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Model dievaluasi menggunakan metrik berikut pada data testing (20%):
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="font-medium mb-2">Accuracy</p>
                                        <BlockMath math="\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="font-medium mb-2">Precision</p>
                                        <BlockMath math="\text{Precision} = \frac{TP}{TP + FP}" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="font-medium mb-2">Recall</p>
                                        <BlockMath math="\text{Recall} = \frac{TP}{TP + FN}" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="font-medium mb-2">F1-Score</p>
                                        <BlockMath math="\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}" />
                                    </div>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg text-sm mt-4">
                                    <p className="text-purple-800 dark:text-purple-200">
                                        <strong>Keterangan:</strong><br />
                                        TP = True Positive (prediksi benar untuk kelas positif)<br />
                                        TN = True Negative (prediksi benar untuk kelas negatif)<br />
                                        FP = False Positive (prediksi salah, seharusnya negatif)<br />
                                        FN = False Negative (prediksi salah, seharusnya positif)
                                    </p>
                                </div>

                                {/* Step 5: K-Fold Cross Validation */}
                                <div className="space-y-4 mt-6">
                                    <h4 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                                        <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
                                        K-Fold Cross Validation (K=5)
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Data training (80%) dibagi menjadi 5 fold. Model dilatih 5 kali dengan rotasi fold validasi.
                                    </p>

                                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                                        <BlockMath math="\text{CV Score} = \frac{1}{K} \sum_{k=1}^{K} \text{Score}_k = \frac{\text{Score}_1 + \text{Score}_2 + \text{Score}_3 + \text{Score}_4 + \text{Score}_5}{5}" />
                                    </div>

                                    <p className="text-xs text-gray-500">
                                        Model <strong>{prediction.model_used}</strong> dipilih karena memiliki rata-rata F1-Score tertinggi dari cross validation.
                                    </p>
                                </div>
                            </div>
                            </div>
                            </div>
                        </details>

                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 justify-center">
                    <Button asChild>
                        <Link href={route('prediction.index')}>Prediksi Baru</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={route('prediction.history')}>Kembali ke Riwayat</Link>
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
