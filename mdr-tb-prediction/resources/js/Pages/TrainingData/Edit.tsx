import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { Label } from '@/ShadcnComponents/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ShadcnComponents/ui/select';
import { Textarea } from '@/ShadcnComponents/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

interface TrainingDataItem {
    id: number;
    usia: string;
    ket_usia: number;
    jenis_kelamin: string;
    status_bekerja: string;
    bb: number;
    tb: number;
    imt: number;
    status_gizi: string;
    status_merokok: string;
    pemeriksaan_kontak: string;
    riwayat_dm: string;
    riwayat_hiv: string;
    komorbiditas: string;
    kepatuhan_minum_obat: string;
    efek_samping_obat: string;
    keterangan_efek_samping: string | null;
    riwayat_pengobatan: string;
    panduan_pengobatan: string;
    keberhasilan_pengobatan: string;
}

interface Props {
    trainingData: TrainingDataItem;
}

export default function Edit({ trainingData }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        usia: trainingData.usia,
        ket_usia: trainingData.ket_usia.toString(),
        jenis_kelamin: trainingData.jenis_kelamin,
        status_bekerja: trainingData.status_bekerja,
        bb: trainingData.bb.toString(),
        tb: trainingData.tb.toString(),
        imt: trainingData.imt.toString(),
        status_gizi: trainingData.status_gizi,
        status_merokok: trainingData.status_merokok,
        pemeriksaan_kontak: trainingData.pemeriksaan_kontak,
        riwayat_dm: trainingData.riwayat_dm,
        riwayat_hiv: trainingData.riwayat_hiv,
        komorbiditas: trainingData.komorbiditas,
        kepatuhan_minum_obat: trainingData.kepatuhan_minum_obat,
        efek_samping_obat: trainingData.efek_samping_obat,
        keterangan_efek_samping: trainingData.keterangan_efek_samping || '',
        riwayat_pengobatan: trainingData.riwayat_pengobatan,
        panduan_pengobatan: trainingData.panduan_pengobatan,
        keberhasilan_pengobatan: trainingData.keberhasilan_pengobatan,
    });

    // Auto calculate IMT when BB or TB changes
    const calculateIMT = (bb: number, tb: number) => {
        if (bb > 0 && tb > 0) {
            const tbInMeter = tb / 100;
            return (bb / (tbInMeter * tbInMeter)).toFixed(1);
        }
        return '';
    };

    const handleBBChange = (value: string) => {
        setData('bb', value);
        const imt = calculateIMT(parseFloat(value), parseFloat(data.tb));
        if (imt) setData('imt', imt);
    };

    const handleTBChange = (value: string) => {
        setData('tb', value);
        const imt = calculateIMT(parseFloat(data.bb), parseFloat(value));
        if (imt) setData('imt', imt);
    };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        put(route('training-data.update', trainingData.id));
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Data Training', href: '/training-data' }, { label: 'Edit' }]}>
            <Head title="Edit Data Training" />

            <Card>
                <CardHeader>
                    <CardTitle>Edit Data Pasien #{trainingData.id}</CardTitle>
                    <CardDescription>
                        Update data pasien
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-6">
                        {/* Demografi */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Data Demografi</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ket_usia">Usia (tahun)</Label>
                                    <Input
                                        id="ket_usia"
                                        type="number"
                                        value={data.ket_usia}
                                        onChange={(e) => setData('ket_usia', e.target.value)}
                                        min={1}
                                        max={120}
                                    />
                                    {errors.ket_usia && <p className="text-sm text-red-500">{errors.ket_usia}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usia">Kategori Usia</Label>
                                    <Select value={data.usia} onValueChange={(value) => setData('usia', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kategori" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Usia Produktif">Usia Produktif</SelectItem>
                                            <SelectItem value="Usia Lanjut">Usia Lanjut</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.usia && <p className="text-sm text-red-500">{errors.usia}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                                    <Select value={data.jenis_kelamin} onValueChange={(value) => setData('jenis_kelamin', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih jenis kelamin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Laki-Laki">Laki-Laki</SelectItem>
                                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.jenis_kelamin && <p className="text-sm text-red-500">{errors.jenis_kelamin}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status_bekerja">Status Bekerja</Label>
                                    <Select value={data.status_bekerja} onValueChange={(value) => setData('status_bekerja', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bekerja">Bekerja</SelectItem>
                                            <SelectItem value="Tidak Bekerja">Tidak Bekerja</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status_bekerja && <p className="text-sm text-red-500">{errors.status_bekerja}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Data Fisik */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Data Fisik</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bb">Berat Badan (kg)</Label>
                                    <Input
                                        id="bb"
                                        type="number"
                                        step="0.1"
                                        value={data.bb}
                                        onChange={(e) => handleBBChange(e.target.value)}
                                    />
                                    {errors.bb && <p className="text-sm text-red-500">{errors.bb}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tb">Tinggi Badan (cm)</Label>
                                    <Input
                                        id="tb"
                                        type="number"
                                        step="0.1"
                                        value={data.tb}
                                        onChange={(e) => handleTBChange(e.target.value)}
                                    />
                                    {errors.tb && <p className="text-sm text-red-500">{errors.tb}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="imt">IMT</Label>
                                    <Input
                                        id="imt"
                                        type="number"
                                        step="0.1"
                                        value={data.imt}
                                        onChange={(e) => setData('imt', e.target.value)}
                                        readOnly
                                        className="bg-gray-100"
                                    />
                                    {errors.imt && <p className="text-sm text-red-500">{errors.imt}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status_gizi">Status Gizi</Label>
                                    <Select value={data.status_gizi} onValueChange={(value) => setData('status_gizi', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Gizi Kurang">Gizi Kurang</SelectItem>
                                            <SelectItem value="Gizi Normal">Gizi Normal</SelectItem>
                                            <SelectItem value="Gizi Lebih">Gizi Lebih</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status_gizi && <p className="text-sm text-red-500">{errors.status_gizi}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status_merokok">Status Merokok</Label>
                                <Select value={data.status_merokok} onValueChange={(value) => setData('status_merokok', value)}>
                                    <SelectTrigger className="w-full md:w-1/2">
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Merokok">Merokok</SelectItem>
                                        <SelectItem value="Tidak Merokok">Tidak Merokok</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status_merokok && <p className="text-sm text-red-500">{errors.status_merokok}</p>}
                            </div>
                        </div>

                        {/* Riwayat Kesehatan */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Riwayat Kesehatan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pemeriksaan_kontak">Pemeriksaan Kontak</Label>
                                    <Select value={data.pemeriksaan_kontak} onValueChange={(value) => setData('pemeriksaan_kontak', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ya">Ya</SelectItem>
                                            <SelectItem value="Tidak">Tidak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="riwayat_dm">Riwayat DM</Label>
                                    <Select value={data.riwayat_dm} onValueChange={(value) => setData('riwayat_dm', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ada">Ada</SelectItem>
                                            <SelectItem value="Tidak">Tidak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="riwayat_hiv">Riwayat HIV</Label>
                                    <Select value={data.riwayat_hiv} onValueChange={(value) => setData('riwayat_hiv', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ada">Ada</SelectItem>
                                            <SelectItem value="Tidak">Tidak</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="komorbiditas">Komorbiditas</Label>
                                    <Select value={data.komorbiditas} onValueChange={(value) => setData('komorbiditas', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ada">Ada</SelectItem>
                                            <SelectItem value="Tidak Ada">Tidak Ada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Pengobatan */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Data Pengobatan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="kepatuhan_minum_obat">Kepatuhan Minum Obat</Label>
                                    <Select value={data.kepatuhan_minum_obat} onValueChange={(value) => setData('kepatuhan_minum_obat', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Patuh">Patuh</SelectItem>
                                            <SelectItem value="Tidak Patuh">Tidak Patuh</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="efek_samping_obat">Efek Samping Obat</Label>
                                    <Select value={data.efek_samping_obat} onValueChange={(value) => setData('efek_samping_obat', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ada Keluhan">Ada Keluhan</SelectItem>
                                            <SelectItem value="Tidak Ada Keluhan">Tidak Ada Keluhan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="riwayat_pengobatan">Riwayat Pengobatan</Label>
                                    <Select value={data.riwayat_pengobatan} onValueChange={(value) => setData('riwayat_pengobatan', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Kasus Baru">Kasus Baru</SelectItem>
                                            <SelectItem value="Kasus Lama">Kasus Lama</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="panduan_pengobatan">Panduan Pengobatan</Label>
                                    <Select value={data.panduan_pengobatan} onValueChange={(value) => setData('panduan_pengobatan', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Jangka Pendek">Jangka Pendek</SelectItem>
                                            <SelectItem value="Jangka Panjang">Jangka Panjang</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="keterangan_efek_samping">Keterangan Efek Samping (opsional)</Label>
                                <Textarea
                                    id="keterangan_efek_samping"
                                    value={data.keterangan_efek_samping}
                                    onChange={(e) => setData('keterangan_efek_samping', e.target.value)}
                                    placeholder="Contoh: Mual, muntah, nyeri sendi..."
                                />
                            </div>
                        </div>

                        {/* Hasil Pengobatan */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Hasil Pengobatan (Diagnosis Dokter)</h3>
                            <div className="space-y-2">
                                <Label htmlFor="keberhasilan_pengobatan">Keberhasilan Pengobatan</Label>
                                <Select value={data.keberhasilan_pengobatan} onValueChange={(value) => setData('keberhasilan_pengobatan', value)}>
                                    <SelectTrigger className="w-full md:w-1/2">
                                        <SelectValue placeholder="Pilih hasil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Berhasil">Berhasil</SelectItem>
                                        <SelectItem value="Tidak Berhasil">Tidak Berhasil</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.keberhasilan_pengobatan && <p className="text-sm text-red-500">{errors.keberhasilan_pengobatan}</p>}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between pt-4">
                            <Link href={route('training-data.index')}>
                                <Button type="button" variant="outline">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Kembali
                                </Button>
                            </Link>
                            <Button type="submit" disabled={processing}>
                                <Save className="h-4 w-4 mr-2" />
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}

