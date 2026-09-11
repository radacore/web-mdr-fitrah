import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { Label } from '@/ShadcnComponents/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ShadcnComponents/ui/select';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import Navbar from '@/ShadcnComponents/Navbar';
import Footer from '@/ShadcnComponents/Footer';
import { BrainCircuit, Activity, Users, ExternalLink, Check, Copy } from 'lucide-react';

interface FormData {
    usia: string;
    ket_usia: string;
    jenis_kelamin: string;
    status_bekerja: string;
    bb: string;
    tb: string;
    imt: string;
    status_gizi: string;
    status_merokok: string;
    pemeriksaan_kontak: string;
    riwayat_dm: string;
    riwayat_hiv: string;
    komorbiditas: string;
    kepatuhan_minum_obat: string;
    efek_samping_obat: string;
    keterangan_efek_samping: string;
    riwayat_pengobatan: string;
    panduan_pengobatan: string;
}

interface PredictionResult {
    prediction: string;
    confidence: number;
    model_used: string;
    probabilities: Record<string, number>;
    slug?: string;
}

export default function Welcome() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [namaLengkap, setNamaLengkap] = useState('');
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        usia: '',
        ket_usia: '',
        jenis_kelamin: '',
        status_bekerja: '',
        bb: '',
        tb: '',
        imt: '',
        status_gizi: '',
        status_merokok: '',
        pemeriksaan_kontak: '',
        riwayat_dm: '',
        riwayat_hiv: '',
        komorbiditas: '',
        kepatuhan_minum_obat: '',
        efek_samping_obat: '',
        keterangan_efek_samping: '',
        riwayat_pengobatan: '',
        panduan_pengobatan: '',
    });

    // Auto-calculate IMT and Status Gizi from BB/TB
    useEffect(() => {
        if (formData.bb && formData.tb) {
            const bb = parseFloat(formData.bb);
            const tb = parseFloat(formData.tb) / 100;
            if (bb > 0 && tb > 0) {
                const imt = bb / (tb * tb);
                const imtStr = imt.toFixed(1);
                let statusGizi = '';
                if (imt < 18.5) statusGizi = '0';
                else if (imt < 23.0) statusGizi = '1';
                else statusGizi = '2';
                setFormData(prev => ({ ...prev, imt: imtStr, status_gizi: statusGizi }));
            }
        }
    }, [formData.bb, formData.tb]);

    const totalSteps = 5;

    const generateInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleCopyLink = () => {
        if (result?.slug) {
            navigator.clipboard.writeText(`${window.location.origin}/hasil/${result.slug}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const validateStep = (currentStep: number): string | null => {
        switch (currentStep) {
            case 1: // Data Demografi
                if (!namaLengkap.trim()) return 'Nama lengkap wajib diisi';
                if (!formData.ket_usia) return 'Usia wajib diisi';
                if (!formData.jenis_kelamin) return 'Jenis kelamin wajib dipilih';
                if (!formData.status_bekerja) return 'Status bekerja wajib dipilih';
                break;
            case 2: // Data Klinis
                if (!formData.riwayat_pengobatan) return 'Riwayat pengobatan wajib dipilih';
                if (!formData.efek_samping_obat) return 'Efek samping obat wajib dipilih';
                if (!formData.panduan_pengobatan) return 'Panduan pengobatan wajib dipilih';
                if (!formData.bb) return 'Berat badan wajib diisi';
                if (!formData.tb) return 'Tinggi badan wajib diisi';
                if (!formData.status_gizi) return 'Status gizi wajib dipilih';
                break;
            case 3: // Perilaku Pasien
                if (!formData.kepatuhan_minum_obat) return 'Kepatuhan minum obat wajib dipilih';
                if (!formData.status_merokok) return 'Status merokok wajib dipilih';
                break;
            case 4: // Riwayat Pemeriksaan & Komorbiditas
                if (!formData.riwayat_dm) return 'Riwayat diabetes wajib dipilih';
                if (!formData.riwayat_hiv) return 'Riwayat HIV wajib dipilih';
                if (!formData.pemeriksaan_kontak) return 'Pemeriksaan kontak wajib dipilih';
                if (!formData.komorbiditas) return 'Komorbiditas wajib dipilih';
                break;
        }
        return null;
    };

    const handleNext = () => {
        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        if (step < totalSteps) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, nama_lengkap: namaLengkap }),
            });

            if (!response.ok) throw new Error('Gagal melakukan prediksi');

            const data = await response.json();
            setResult(data);
            setStep(6); // Result step
        } catch (err) {
            setError('Gagal melakukan prediksi. Pastikan ML Service berjalan.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setResult(null);
        setFormData({
            usia: '', ket_usia: '', jenis_kelamin: '', status_bekerja: '',
            bb: '', tb: '', imt: '', status_gizi: '', status_merokok: '',
            pemeriksaan_kontak: '', riwayat_dm: '', riwayat_hiv: '',
            komorbiditas: '', kepatuhan_minum_obat: '', efek_samping_obat: '',
            keterangan_efek_samping: '', riwayat_pengobatan: '', panduan_pengobatan: '',
        });
    };

    const stepTitles = [
        'Data Demografi',
        'Data Klinis',
        'Perilaku Pasien',
        'Pemeriksaan & Komorbiditas',
        'Konfirmasi',
    ];

    return (
        <>
            <Head title="Prediksi Keberhasilan Pengobatan MDR-TB" />
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar minimal />

                {/* Main Content */}
                <main className="flex-grow px-4 pb-12 pt-32">
                    <div className="max-w-2xl mx-auto">
                        {/* Hero Text - Visible until result shown */}
                        {step <= 5 && !result && (
                            <div className="text-center mb-10">
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Prediksi Keberhasilan Pengobatan
                                </h1>
                                <p className="text-xl text-purple-600 font-semibold mb-2">
                                    Multi-Drug Resistant Tuberculosis (MDR-TB)
                                </p>
                                <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
                                    Gunakan sistem Machine Learning kami untuk membantu Anda memahami peluang kesembuhan secara mandiri.
                                </p>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {step <= totalSteps && (
                            <div className="mb-6">
                                <div className="flex justify-between mb-2">
                                    {stepTitles.map((title, idx) => (
                                        <div
                                            key={idx}
                                            className={`text-xs font-medium ${step > idx + 1 ? 'text-green-600' :
                                                step === idx + 1 ? 'text-gray-900 font-bold' : 'text-gray-400'
                                                }`}
                                        >
                                            {idx + 1}. {title}
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300 shadow-sm"
                                        style={{ width: `${(step / totalSteps) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Step Wrappers for consistent height */}
                        <div className="flex flex-col min-h-[500px]">
                            <div className="flex-1">
                                {/* Step 1: Demographics */}
                                {step === 1 && (
                                    <Card className="backdrop-blur bg-white/95 shadow-2xl border-0">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">📋 Data Demografi Pasien</CardTitle>
                                            <CardDescription>Masukkan informasi dasar pasien</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Nama Lengkap */}
                                            <div>
                                                <Label>
                                                    Nama Lengkap{" "}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    type="text"
                                                    value={namaLengkap}
                                                    onChange={(e) =>
                                                        setNamaLengkap(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Masukkan Nama Lengkap anda"
                                                />
                                                {namaLengkap.trim() && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Inisial:{" "}
                                                        <strong>
                                                            {generateInitials(
                                                                namaLengkap,
                                                            ).toUpperCase()}
                                                        </strong>{" "}
                                                        — akan digunakan sebagai
                                                        link hasil prediksi
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>
                                                        Usia (tahun){" "}
                                                        <span className="text-red-500">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        value={
                                                            formData.ket_usia
                                                        }
                                                        onChange={(e) => {
                                                            const age =
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                );
                                                            setFormData({
                                                                ...formData,
                                                                ket_usia:
                                                                    e.target
                                                                        .value,
                                                                // Auto-select kategori usia
                                                                usia: !isNaN(
                                                                    age,
                                                                )
                                                                    ? age > 45
                                                                        ? "1"
                                                                        : "0"
                                                                    : formData.usia,
                                                            });
                                                        }}
                                                        placeholder="Contoh: 45"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>
                                                        Kategori Usia{" "}
                                                        <span className="text-xs text-gray-500">
                                                            (otomatis)
                                                        </span>
                                                    </Label>
                                                    <Select
                                                        value={formData.usia}
                                                        onValueChange={(v) =>
                                                            setFormData({
                                                                ...formData,
                                                                usia: v,
                                                            })
                                                        }
                                                        disabled
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Auto-terisi" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">
                                                                Usia Produktif
                                                                (≤45 thn)
                                                            </SelectItem>
                                                            <SelectItem value="1">
                                                                Usia Lanjut
                                                                (&gt;45 thn)
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Jenis Kelamin</Label>
                                                    <Select
                                                        value={
                                                            formData.jenis_kelamin
                                                        }
                                                        onValueChange={(v) =>
                                                            setFormData({
                                                                ...formData,
                                                                jenis_kelamin:
                                                                    v,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">
                                                                Laki-Laki
                                                            </SelectItem>
                                                            <SelectItem value="1">
                                                                Perempuan
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Status Bekerja</Label>
                                                    <Select
                                                        value={
                                                            formData.status_bekerja
                                                        }
                                                        onValueChange={(v) =>
                                                            setFormData({
                                                                ...formData,
                                                                status_bekerja:
                                                                    v,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">
                                                                Bekerja
                                                            </SelectItem>
                                                            <SelectItem value="0">
                                                                Tidak Bekerja
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Step 2: Data Klinis */}
                                {step === 2 && (
                                    <Card className="backdrop-blur bg-white/95 shadow-2xl border-0">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">🩺 Data Klinis</CardTitle>
                                            <CardDescription>Informasi klinis dan pengobatan pasien</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Riwayat Pengobatan Sebelumnya</Label>
                                                    <Select
                                                        value={formData.riwayat_pengobatan}
                                                        onValueChange={(v) => setFormData({ ...formData, riwayat_pengobatan: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Kasus Baru</SelectItem>
                                                            <SelectItem value="1">Kasus Lama</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Efek Samping Obat</Label>
                                                    <Select
                                                        value={formData.efek_samping_obat}
                                                        onValueChange={(v) => setFormData({
                                                            ...formData,
                                                            efek_samping_obat: v,
                                                            keterangan_efek_samping: v === '0' ? '' : formData.keterangan_efek_samping
                                                        })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Ada Keluhan</SelectItem>
                                                            <SelectItem value="0">Tidak Ada Keluhan</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Conditional: Keterangan Efek Samping */}
                                            {formData.efek_samping_obat === '1' && (
                                                <div>
                                                    <Label>Keterangan Efek Samping</Label>
                                                    <Input
                                                        type="text"
                                                        value={formData.keterangan_efek_samping}
                                                        onChange={(e) => setFormData({ ...formData, keterangan_efek_samping: e.target.value })}
                                                        placeholder="Contoh: Mual, muntah ringan, nyeri sendi"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Sebutkan keluhan yang dialami, pisahkan dengan koma
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <Label>Panduan Pengobatan</Label>
                                                <Select
                                                    value={formData.panduan_pengobatan}
                                                    onValueChange={(v) => setFormData({ ...formData, panduan_pengobatan: v })}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">Jangka Pendek</SelectItem>
                                                        <SelectItem value="1">Jangka Panjang</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="pt-4 border-t">
                                                <p className="text-sm font-medium text-gray-700 mb-3">Status Gizi</p>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <Label>Berat Badan (kg)</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.bb}
                                                            onChange={(e) => setFormData({ ...formData, bb: e.target.value })}
                                                            placeholder="50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Tinggi Badan (cm)</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.tb}
                                                            onChange={(e) => setFormData({ ...formData, tb: e.target.value })}
                                                            placeholder="165"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>IMT (otomatis)</Label>
                                                        <Input
                                                            type="text"
                                                            value={formData.imt}
                                                            readOnly
                                                            className="bg-gray-100"
                                                            placeholder="Terisi otomatis"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <Label>Status Gizi <span className="text-xs text-gray-500">(otomatis)</span></Label>
                                                    <Select
                                                        value={formData.status_gizi}
                                                        onValueChange={(v) => setFormData({ ...formData, status_gizi: v })}
                                                        disabled
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Auto-terisi" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Gizi Kurang</SelectItem>
                                                            <SelectItem value="1">Gizi Normal</SelectItem>
                                                            <SelectItem value="2">Gizi Lebih</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Step 3: Perilaku Pasien */}
                                {step === 3 && (
                                    <Card className="backdrop-blur bg-white/95 shadow-2xl border-0">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">🚶 Perilaku Pasien</CardTitle>
                                            <CardDescription>Informasi perilaku dan kebiasaan pasien</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Kepatuhan Minum Obat</Label>
                                                    <Select
                                                        value={formData.kepatuhan_minum_obat}
                                                        onValueChange={(v) => setFormData({ ...formData, kepatuhan_minum_obat: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">Patuh</SelectItem>
                                                            <SelectItem value="1">Tidak Patuh</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Status Merokok</Label>
                                                    <Select
                                                        value={formData.status_merokok}
                                                        onValueChange={(v) => setFormData({ ...formData, status_merokok: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Merokok</SelectItem>
                                                            <SelectItem value="0">Tidak Merokok</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Step 4: Riwayat Pemeriksaan & Komorbiditas */}
                                {step === 4 && (
                                    <Card className="backdrop-blur bg-white/95 shadow-2xl border-0">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">📋 Riwayat Pemeriksaan & Komorbiditas</CardTitle>
                                            <CardDescription>Riwayat penyakit dan pemeriksaan kontak pasien</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Riwayat Diabetes (DM)</Label>
                                                    <Select
                                                        value={formData.riwayat_dm}
                                                        onValueChange={(v) => setFormData({ ...formData, riwayat_dm: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Ya</SelectItem>
                                                            <SelectItem value="0">Tidak</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Riwayat HIV</Label>
                                                    <Select
                                                        value={formData.riwayat_hiv}
                                                        onValueChange={(v) => setFormData({ ...formData, riwayat_hiv: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Ya</SelectItem>
                                                            <SelectItem value="0">Tidak</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Pemeriksaan Kontak</Label>
                                                    <Select
                                                        value={formData.pemeriksaan_kontak}
                                                        onValueChange={(v) => setFormData({ ...formData, pemeriksaan_kontak: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Ya</SelectItem>
                                                            <SelectItem value="0">Tidak</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>Komorbiditas Lain</Label>
                                                    <Select
                                                        value={formData.komorbiditas}
                                                        onValueChange={(v) => setFormData({ ...formData, komorbiditas: v })}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">Ada</SelectItem>
                                                            <SelectItem value="0">Tidak Ada</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Step 5: Confirmation */}
                                {step === 5 && (
                                    <Card className="backdrop-blur bg-white/95 shadow-2xl border-0">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">✅ Konfirmasi Data</CardTitle>
                                            <CardDescription>Periksa kembali data yang Anda masukkan</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Bagian 1: Data Demografi */}
                                            <div>
                                                <h4 className="font-semibold text-purple-700 mb-2 text-sm">📋 Data Demografi</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-purple-50 rounded-lg p-3">
                                                    <p><strong>Nama:</strong> {namaLengkap}</p>
                                                    <p><strong>Usia:</strong> {formData.ket_usia} tahun ({formData.usia === '1' ? 'Usia Lanjut' : 'Usia Produktif'})</p>
                                                    <p><strong>Jenis Kelamin:</strong> {formData.jenis_kelamin === '1' ? 'Perempuan' : 'Laki-Laki'}</p>
                                                    <p><strong>Pekerjaan:</strong> {formData.status_bekerja === '1' ? 'Bekerja' : 'Tidak Bekerja'}</p>
                                                </div>
                                            </div>
                                            {/* Bagian 2: Data Klinis */}
                                            <div>
                                                <h4 className="font-semibold text-purple-700 mb-2 text-sm">🩺 Data Klinis</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-purple-50 rounded-lg p-3">
                                                    <p><strong>Riwayat Pengobatan:</strong> {formData.riwayat_pengobatan === '1' ? 'Kasus Lama' : 'Kasus Baru'}</p>
                                                    <p><strong>Efek Samping:</strong> {formData.efek_samping_obat === '1' ? 'Ada Keluhan' : 'Tidak Ada'}</p>
                                                    {formData.efek_samping_obat === '1' && formData.keterangan_efek_samping && (
                                                        <p className="col-span-2"><strong>Keterangan:</strong> {formData.keterangan_efek_samping}</p>
                                                    )}
                                                    <p><strong>Panduan:</strong> {formData.panduan_pengobatan === '1' ? 'Jangka Panjang' : 'Jangka Pendek'}</p>
                                                    <p><strong>BB/TB:</strong> {formData.bb} kg / {formData.tb} cm</p>
                                                    <p><strong>IMT:</strong> {formData.imt}</p>
                                                    <p><strong>Status Gizi:</strong> {formData.status_gizi === '2' ? 'Gizi Lebih' : formData.status_gizi === '1' ? 'Gizi Normal' : 'Gizi Kurang'}</p>
                                                </div>
                                            </div>
                                            {/* Bagian 3: Perilaku Pasien */}
                                            <div>
                                                <h4 className="font-semibold text-purple-700 mb-2 text-sm">🚶 Perilaku Pasien</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-purple-50 rounded-lg p-3">
                                                    <p><strong>Kepatuhan Obat:</strong> {formData.kepatuhan_minum_obat === '1' ? 'Tidak Patuh' : 'Patuh'}</p>
                                                    <p><strong>Status Merokok:</strong> {formData.status_merokok === '1' ? 'Merokok' : 'Tidak Merokok'}</p>
                                                </div>
                                            </div>
                                            {/* Bagian 4: Riwayat Pemeriksaan & Komorbiditas */}
                                            <div>
                                                <h4 className="font-semibold text-purple-700 mb-2 text-sm">📋 Riwayat Pemeriksaan & Komorbiditas</h4>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-purple-50 rounded-lg p-3">
                                                    <p><strong>Riwayat DM:</strong> {formData.riwayat_dm === '1' ? 'Ya' : 'Tidak'}</p>
                                                    <p><strong>Riwayat HIV:</strong> {formData.riwayat_hiv === '1' ? 'Ya' : 'Tidak'}</p>
                                                    <p><strong>Pemeriksaan Kontak:</strong> {formData.pemeriksaan_kontak === '1' ? 'Ya' : 'Tidak'}</p>
                                                    <p><strong>Komorbiditas:</strong> {formData.komorbiditas === '1' ? 'Ada' : 'Tidak Ada'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Step 6: Result */}
                                {step === 6 && result && (
                                    <Card
                                        className={`backdrop-blur shadow-2xl border-0 ${result.prediction === "Berhasil"
                                            ? "bg-gradient-to-br from-green-50 to-green-100"
                                            : "bg-gradient-to-br from-red-50 to-red-100"
                                            }`}
                                    >
                                        <CardHeader className="text-center">
                                            <div className="text-6xl mb-4">
                                                {result.prediction ===
                                                    "Berhasil"
                                                    ? "✅"
                                                    : "❌"}
                                            </div>
                                            <div className="flex flex-col items-center mb-2">
                                                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xl font-bold mb-2">
                                                    {generateInitials(namaLengkap)}
                                                </div>
                                                <p className="text-sm text-gray-600">{namaLengkap}</p>
                                            </div>
                                            <CardTitle className="text-3xl">
                                                Prediksi: {result.prediction}
                                            </CardTitle>
                                            <CardDescription className="text-lg">
                                                Tingkat Keyakinan:{" "}
                                                {result.confidence.toFixed(1)}%
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-center mb-6">
                                                <p className="text-gray-600">
                                                    Model yang digunakan:{" "}
                                                    <strong>
                                                        {result.model_used}
                                                    </strong>
                                                </p>
                                            </div>

                                            {/* Shareable Link */}
                                            {result.slug && (
                                                <div className="bg-white/70 rounded-lg p-4 mb-4 border border-gray-200">
                                                    <h4 className="font-semibold mb-2 text-gray-700 flex items-center gap-2">
                                                        <ExternalLink className="h-4 w-4" />
                                                        Link Hasil Prediksi
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mb-2">
                                                        Simpan atau bagikan link
                                                        berikut untuk melihat
                                                        kembali hasil prediksi
                                                        Anda kapan saja.
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            readOnly
                                                            value={`${window.location.origin}/hasil/${result.slug}`}
                                                            className="bg-gray-50 text-sm"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={
                                                                handleCopyLink
                                                            }
                                                            className="flex-shrink-0 gap-1"
                                                        >
                                                            {copied ? (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <Copy className="h-4 w-4" />
                                                            )}
                                                            {copied
                                                                ? "Tersalin!"
                                                                : "Salin"}
                                                        </Button>
                                                    </div>
                                                    <a
                                                        href={`/hasil/${result.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline mt-2"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Buka halaman hasil
                                                    </a>
                                                </div>
                                            )}

                                            <div className="bg-white/50 rounded-lg p-4">
                                                <h4 className="font-semibold mb-3">
                                                    Probabilitas per Model:
                                                </h4>
                                                <div className="space-y-2">
                                                    {Object.entries(
                                                        result.probabilities,
                                                    ).map(([model, prob]) => (
                                                        <div key={model} className="flex items-center gap-3">
                                                            <span className="w-40 text-sm">{model}</span>
                                                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                                <div
                                                                    className={`h-3 rounded-full ${prob > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${prob}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium">{prob.toFixed(1)}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex justify-between mt-6">
                                    {step > 1 && step <= totalSteps && (
                                        <Button
                                            onClick={handlePrev}
                                            variant="outline"
                                            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 px-6"
                                        >
                                            ← Kembali
                                        </Button>
                                    )}
                                    {step === 1 && <div />}

                                    {step < totalSteps && (
                                        <Button
                                            onClick={handleNext}
                                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 shadow-lg shadow-purple-500/20"
                                        >
                                            Selanjutnya →
                                        </Button>
                                    )}

                                    {step === totalSteps && (
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                        >
                                            {loading ? '⏳ Memproses...' : '🔮 Prediksi Sekarang'}
                                        </Button>
                                    )}

                                    {step === 6 && (
                                        <Button
                                            onClick={resetForm}
                                            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white mx-auto"
                                        >
                                            🔄 Prediksi Baru
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}
