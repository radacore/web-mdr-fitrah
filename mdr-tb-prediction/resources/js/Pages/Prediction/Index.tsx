import AppLayout from "@/Layouts/AppLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import { Button } from "@/ShadcnComponents/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/ShadcnComponents/ui/card";
import { Input } from "@/ShadcnComponents/ui/input";
import { Label } from "@/ShadcnComponents/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ShadcnComponents/ui/select";
import { Alert, AlertDescription } from "@/ShadcnComponents/ui/alert";
import { FormEventHandler, useState } from "react";
import {
    User,

    HeartPulse,
    Pill,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Footprints,
    ClipboardList,
} from "lucide-react";


interface Props {
    features: any;
    mlServiceStatus: "connected" | "disconnected";
}

export default function Index({ features, mlServiceStatus }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        nama_lengkap: "",
        usia: "0", // 0: Usia Produktif, 1: Usia Lanjut
        ket_usia: "",
        jenis_kelamin: "0", // 0: Laki-Laki, 1: Perempuan
        status_bekerja: "0", // 0: Tidak Bekerja, 1: Bekerja
        bb: "",
        tb: "",
        imt: "",
        status_gizi: "1", // 0: Gizi Kurang, 1: Gizi Normal, 2: Gizi Lebih
        status_merokok: "0", // 0: Tidak Merokok, 1: Merokok
        pemeriksaan_kontak: "0", // 0: Tidak, 1: Ya
        riwayat_dm: "0", // 0: Tidak, 1: Ada
        riwayat_hiv: "0", // 0: Tidak, 1: Ada
        komorbiditas: "0", // 0: Tidak Ada, 1: Ada
        kepatuhan_minum_obat: "0", // 0: Patuh, 1: Tidak Patuh
        efek_samping_obat: "0", // 0: Tidak Ada Keluhan, 1: Ada Keluhan
        keterangan_efek_samping: "",
        riwayat_pengobatan: "0", // 0: Kasus Baru, 1: Kasus Lama
        panduan_pengobatan: "0", // 0: Jangka Pendek, 1: Jangka Panjang
        model_name: "auto",
    });

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;

    const nextStep = () =>
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    // Auto-calculate IMT when BB and TB change
    const calculateIMT = (bb: string, tb: string) => {
        if (bb && tb) {
            const bbNum = parseFloat(bb);
            const tbNum = parseFloat(tb) / 100; // convert cm to m
            const imt = bbNum / (tbNum * tbNum);
            setData("imt", imt.toFixed(1));
        }
    };

    // Auto-select kategori usia berdasarkan usia
    const handleUsiaChange = (value: string) => {
        setData("ket_usia", value);
        const age = parseInt(value);
        if (!isNaN(age)) {
            // Usia Lanjut: > 45 tahun (1), Usia Produktif: <= 45 tahun (0)
            const kategori = age > 45 ? "1" : "0";
            setData("usia", kategori);
        }
    };

    // Validasi per step — tombol Selanjutnya disabled jika ada field kosong
    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 1: // Data Demografi
                return data.nama_lengkap.trim() !== '' && data.ket_usia !== '';
            case 2: // Data Klinis
                return data.bb !== '' && data.tb !== '' && data.imt !== '';
            case 3: // Perilaku Pasien
                return true; // Semua field dropdown punya default value
            case 4: // Riwayat & Komorbiditas
                return true; // Semua field dropdown punya default value
            case 5: // Konfirmasi
                return true;
            default:
                return true;
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Cek jika masih di step sebelumnya, jangan submit form melainkan lanjut step
        if (currentStep < totalSteps) {
            nextStep();
            return;
        }
        post(route("prediction.predict"));
    };

    return (
        <AppLayout breadcrumbs={[{ label: "Prediksi" }]}>
            <Head title="Prediksi MDR-TB" />

            <div className="space-y-6">
                {mlServiceStatus === "disconnected" && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            ⚠️ ML Service tidak tersedia. Pastikan service
                            Python berjalan di port 5000.
                        </AlertDescription>
                    </Alert>
                )}

                {Object.keys(errors).length > 0 && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {Object.values(errors).map((error, i) => (
                                <p key={i}>{error}</p>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Progress Bar & Step Indicator */}
                <div className="mb-8">
                    <div className="relative flex justify-between items-start">
                        {/* Connecting Line Background */}
                        <div className="absolute top-5 left-[5%] right-[5%] h-1 bg-muted rounded-full">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-in-out rounded-full"
                                style={{
                                    width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
                                }}
                            />
                        </div>
                        {/* Step Circles */}
                        {[1, 2, 3, 4, 5].map((step) => (
                            <div
                                key={step}
                                className="flex flex-col items-center relative z-10"
                                style={{ width: '20%' }}
                            >
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300
                                    ${
                                        currentStep === step
                                            ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 scale-110"
                                            : currentStep > step
                                              ? "bg-primary text-primary-foreground"
                                              : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {currentStep > step ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : (
                                        step
                                    )}
                                </div>
                                <span className={`text-xs mt-2 text-center font-medium transition-colors ${currentStep >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {step === 1 ? 'Demografi' : step === 2 ? 'Klinis' : step === 3 ? 'Perilaku' : step === 4 ? 'Komorbiditas' : 'Konfirmasi'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="flex flex-col min-h-[600px]">
                    <div className="flex-1 space-y-6">
                        {/* Step 1: Data Demografi */}
                        <div
                            className={
                                currentStep === 1
                                    ? "block space-y-6 animate-in fade-in slide-in-from-right-4 duration-300"
                                    : "hidden"
                            }
                        >
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Data Demografi</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Informasi dasar tentang pasien
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="nama_lengkap">
                                            Nama Lengkap{" "}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="nama_lengkap"
                                            type="text"
                                            value={data.nama_lengkap}
                                            onChange={(e) => setData('nama_lengkap', e.target.value)}
                                            placeholder="Masukkan nama lengkap pasien"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ket_usia">
                                            Usia (tahun){" "}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            id="ket_usia"
                                            type="number"
                                            value={data.ket_usia}
                                            onChange={(e) => handleUsiaChange(e.target.value)}
                                            placeholder="Contoh: 45"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="usia">
                                            Kategori Usia{" "}
                                            <span className="text-muted-foreground text-xs">(otomatis)</span>
                                        </Label>
                                        <Select value={data.usia} onValueChange={(v) => setData("usia", v)} disabled>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Usia Produktif (≤45 thn)</SelectItem>
                                                <SelectItem value="1">Usia Lanjut (&gt;45 thn)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="jenis_kelamin">
                                            Jenis Kelamin <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={data.jenis_kelamin} onValueChange={(v) => setData("jenis_kelamin", v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Laki-Laki</SelectItem>
                                                <SelectItem value="1">Perempuan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status_bekerja">Pekerjaan <span className="text-destructive">*</span></Label>
                                        <Select value={data.status_bekerja} onValueChange={(v) => setData('status_bekerja', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Bekerja</SelectItem>
                                                <SelectItem value="0">Tidak Bekerja</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Step 2: Data Klinis */}
                        <div className={currentStep === 2 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <Pill className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Data Klinis</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Informasi klinis dan pengobatan pasien
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="riwayat_pengobatan">Riwayat Pengobatan Sebelumnya</Label>
                                            <Select value={data.riwayat_pengobatan} onValueChange={(v) => setData('riwayat_pengobatan', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Kasus Baru</SelectItem>
                                                    <SelectItem value="1">Kasus Lama</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="efek_samping_obat">Efek Samping Obat</Label>
                                            <Select
                                                value={data.efek_samping_obat}
                                                onValueChange={(v) => {
                                                    setData('efek_samping_obat', v);
                                                    if (v === '0') {
                                                        setData('keterangan_efek_samping', '');
                                                    }
                                                }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Ada Keluhan</SelectItem>
                                                    <SelectItem value="0">Tidak Ada Keluhan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {data.efek_samping_obat === '1' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="keterangan_efek_samping">Keterangan Efek Samping</Label>
                                            <Input
                                                id="keterangan_efek_samping"
                                                type="text"
                                                value={data.keterangan_efek_samping}
                                                onChange={(e) => setData('keterangan_efek_samping', e.target.value)}
                                                placeholder="Contoh: Mual, muntah ringan, nyeri sendi"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Sebutkan keluhan yang dialami, pisahkan dengan koma
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="panduan_pengobatan">Panduan Pengobatan</Label>
                                        <Select value={data.panduan_pengobatan} onValueChange={(v) => setData('panduan_pengobatan', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Jangka Pendek</SelectItem>
                                                <SelectItem value="1">Jangka Panjang</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium mb-3">Status Gizi</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bb">Berat Badan (kg) <span className="text-destructive">*</span></Label>
                                                <Input id="bb" type="number" step="0.1" value={data.bb} onChange={(e) => {
                                                    setData('bb', e.target.value);
                                                    setTimeout(() => calculateIMT(e.target.value, data.tb), 100);
                                                }} placeholder="Contoh: 50" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tb">Tinggi Badan (cm) <span className="text-destructive">*</span></Label>
                                                <Input id="tb" type="number" step="0.1" value={data.tb} onChange={(e) => {
                                                    setData('tb', e.target.value);
                                                    setTimeout(() => calculateIMT(data.bb, e.target.value), 100);
                                                }} placeholder="Contoh: 160" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="imt">IMT <span className="text-muted-foreground text-xs">(otomatis)</span></Label>
                                                <Input id="imt" type="number" step="0.1" value={data.imt} readOnly className="bg-muted" />
                                            </div>
                                        </div>
                                        <div className="mt-3 max-w-xs">
                                            <Label htmlFor="status_gizi">Status Gizi <span className="text-destructive">*</span></Label>
                                            <Select value={data.status_gizi} onValueChange={(v) => setData('status_gizi', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                        </div>

                        {/* Step 3: Perilaku Pasien */}
                        <div className={currentStep === 3 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <Footprints className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Perilaku Pasien</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Informasi perilaku dan kebiasaan pasien
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="kepatuhan_minum_obat">Kepatuhan Minum Obat</Label>
                                        <Select value={data.kepatuhan_minum_obat} onValueChange={(v) => setData('kepatuhan_minum_obat', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Patuh</SelectItem>
                                                <SelectItem value="1">Tidak Patuh</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status_merokok">Status Merokok</Label>
                                        <Select value={data.status_merokok} onValueChange={(v) => setData('status_merokok', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Merokok</SelectItem>
                                                <SelectItem value="0">Tidak Merokok</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Step 4: Riwayat Pemeriksaan & Komorbiditas */}
                        <div className={currentStep === 4 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <HeartPulse className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Riwayat Pemeriksaan & Komorbiditas</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Riwayat penyakit dan pemeriksaan kontak pasien
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="riwayat_dm">Riwayat Diabetes (DM)</Label>
                                        <Select value={data.riwayat_dm} onValueChange={(v) => setData('riwayat_dm', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Ya</SelectItem>
                                                <SelectItem value="0">Tidak</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="riwayat_hiv">Riwayat HIV</Label>
                                        <Select value={data.riwayat_hiv} onValueChange={(v) => setData('riwayat_hiv', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Ya</SelectItem>
                                                <SelectItem value="0">Tidak</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pemeriksaan_kontak">Pemeriksaan Kontak</Label>
                                        <Select value={data.pemeriksaan_kontak} onValueChange={(v) => setData('pemeriksaan_kontak', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Ya</SelectItem>
                                                <SelectItem value="0">Tidak</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="komorbiditas">Komorbiditas Lain</Label>
                                        <Select value={data.komorbiditas} onValueChange={(v) => setData('komorbiditas', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Ada</SelectItem>
                                                <SelectItem value="0">Tidak Ada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Step 5: Konfirmasi */}
                        <div className={currentStep === 5 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4 duration-300' : 'hidden'}>
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Konfirmasi Data</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Periksa kembali data yang Anda masukkan sebelum melakukan prediksi
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Bagian 1: Data Demografi */}
                                    <div>
                                        <h4 className="font-semibold text-primary mb-2 text-sm">📋 Data Demografi</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 rounded-lg p-3">
                                            <p><strong>Nama:</strong> {data.nama_lengkap}</p>
                                            <p><strong>Usia:</strong> {data.ket_usia} tahun ({data.usia === '1' ? 'Usia Lanjut' : 'Usia Produktif'})</p>
                                            <p><strong>Jenis Kelamin:</strong> {data.jenis_kelamin === '1' ? 'Perempuan' : 'Laki-Laki'}</p>
                                            <p><strong>Pekerjaan:</strong> {data.status_bekerja === '1' ? 'Bekerja' : 'Tidak Bekerja'}</p>
                                        </div>
                                    </div>
                                    {/* Bagian 2: Data Klinis */}
                                    <div>
                                        <h4 className="font-semibold text-primary mb-2 text-sm">🩺 Data Klinis</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 rounded-lg p-3">
                                            <p><strong>Riwayat Pengobatan:</strong> {data.riwayat_pengobatan === '1' ? 'Kasus Lama' : 'Kasus Baru'}</p>
                                            <p><strong>Efek Samping:</strong> {data.efek_samping_obat === '1' ? 'Ada Keluhan' : 'Tidak Ada'}</p>
                                            {data.efek_samping_obat === '1' && data.keterangan_efek_samping && (
                                                <p className="col-span-2"><strong>Keterangan:</strong> {data.keterangan_efek_samping}</p>
                                            )}
                                            <p><strong>Panduan:</strong> {data.panduan_pengobatan === '1' ? 'Jangka Panjang' : 'Jangka Pendek'}</p>
                                            <p><strong>BB/TB:</strong> {data.bb} kg / {data.tb} cm</p>
                                            <p><strong>IMT:</strong> {data.imt}</p>
                                            <p><strong>Status Gizi:</strong> {data.status_gizi === '2' ? 'Gizi Lebih' : data.status_gizi === '1' ? 'Gizi Normal' : 'Gizi Kurang'}</p>
                                        </div>
                                    </div>
                                    {/* Bagian 3: Perilaku Pasien */}
                                    <div>
                                        <h4 className="font-semibold text-primary mb-2 text-sm">🚶 Perilaku Pasien</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 rounded-lg p-3">
                                            <p><strong>Kepatuhan Obat:</strong> {data.kepatuhan_minum_obat === '1' ? 'Tidak Patuh' : 'Patuh'}</p>
                                            <p><strong>Status Merokok:</strong> {data.status_merokok === '1' ? 'Merokok' : 'Tidak Merokok'}</p>
                                        </div>
                                    </div>
                                    {/* Bagian 4: Riwayat Pemeriksaan & Komorbiditas */}
                                    <div>
                                        <h4 className="font-semibold text-primary mb-2 text-sm">📋 Riwayat Pemeriksaan & Komorbiditas</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/50 rounded-lg p-3">
                                            <p><strong>Riwayat DM:</strong> {data.riwayat_dm === '1' ? 'Ya' : 'Tidak'}</p>
                                            <p><strong>Riwayat HIV:</strong> {data.riwayat_hiv === '1' ? 'Ya' : 'Tidak'}</p>
                                            <p><strong>Pemeriksaan Kontak:</strong> {data.pemeriksaan_kontak === '1' ? 'Ya' : 'Tidak'}</p>
                                            <p><strong>Komorbiditas:</strong> {data.komorbiditas === '1' ? 'Ada' : 'Tidak Ada'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Next/Prev Buttons Navigation */}
                    <div className="flex justify-between mt-8 sticky bottom-6 z-10 p-4 bg-background/80 backdrop-blur-sm shadow-sm rounded-xl border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 1 || processing}
                            className="w-32"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Sebelumnya
                        </Button>

                        {currentStep < totalSteps ? (
                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={!isStepValid(currentStep)}
                                className="w-32"
                            >
                                Selanjutnya
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-48"
                            >
                                {processing
                                    ? "Memproses..."
                                    : "🔮 Prediksi Sekarang"}
                            </Button>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="link" asChild size="sm">
                            <Link href={route("prediction.history")}>
                                📋 Lihat Riwayat Prediksi
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
