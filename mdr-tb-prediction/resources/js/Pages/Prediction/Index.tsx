import AppLayout from '@/Layouts/AppLayout';
import { Field, SelectField } from '@/ShadcnComponents/Field';
import { Alert, AlertDescription, AlertTitle } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { Textarea } from '@/ShadcnComponents/ui/textarea';
import { VariabelTurunan } from '@/ShadcnComponents/VariabelTurunan';
import {
    BATAS_BULAN_PENGOBATAN_LAMA,
    BATAS_USIA_LANJUT,
    KELOMPOK_VARIABEL,
    LABEL,
    OPSI,
    hitungDurasiPengobatan,
    hitungImt,
    tanggalHariIni,
    tentukanKategoriUsia,
    tentukanStatusPengobatan,
} from '@/lib/variabel';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Fragment, useMemo } from 'react';

interface PredictionForm {
    nama_lengkap: string;
    ket_usia: string;
    jenis_kelamin: string;
    status_bekerja: string;
    bb: string;
    tb: string;
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
    tanggal_awal_pengobatan: string;
    [key: string]: string;
}

interface Props {
    features: { total_features?: number } | null;
    mlServiceStatus: 'connected' | 'disconnected';
}

const NILAI_AWAL: PredictionForm = {
    nama_lengkap: '',
    ket_usia: '',
    jenis_kelamin: '',
    status_bekerja: '',
    bb: '',
    tb: '',
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
    tanggal_awal_pengobatan: '',
};

/** Variabel numerik ditampilkan sebagai input angka, sisanya sebagai pilihan. */
const VARIABEL_NUMERIK = ['ket_usia', 'bb', 'tb'];

export default function Index({ features, mlServiceStatus }: Props) {
    const { data, setData, post, processing, errors } =
        useForm<PredictionForm>(NILAI_AWAL);

    const imt = useMemo(() => hitungImt(data.bb, data.tb), [data.bb, data.tb]);
    const kategoriUsia = useMemo(
        () => tentukanKategoriUsia(data.ket_usia),
        [data.ket_usia],
    );

    // Durasi dan status pengobatan merupakan variabel turunan tampilan,
    // dihitung dari tanggal awal pengobatan dan tidak dikirim ke model.
    const durasi = useMemo(
        () => hitungDurasiPengobatan(data.tanggal_awal_pengobatan),
        [data.tanggal_awal_pengobatan],
    );
    const statusPengobatan = data.tanggal_awal_pengobatan
        ? tentukanStatusPengobatan(durasi.bulan)
        : '';

    const terisi = useMemo(() => {
        const wajib = Object.keys(NILAI_AWAL).filter(
            (k) => k !== 'nama_lengkap' && k !== 'keterangan_efek_samping',
        );
        return wajib.filter((k) => data[k] !== '').length;
    }, [data]);

    const totalWajib = Object.keys(NILAI_AWAL).length - 2;
    const lengkap = terisi === totalWajib;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('prediction.predict'));
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Klasifikasi' }]}>
            <Head title="Klasifikasi Keberhasilan Pengobatan" />

            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Klasifikasi Keberhasilan Pengobatan
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Masukkan data rekam medis pasien MDR-TB untuk memperoleh
                        klasifikasi keberhasilan pengobatan menggunakan model Random Forest.
                    </p>
                </div>

                {mlServiceStatus === 'disconnected' && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Layanan model tidak tersedia</AlertTitle>
                        <AlertDescription>
                            Layanan machine learning tidak dapat dihubungi. Jalankan
                            layanan terlebih dahulu sebelum melakukan klasifikasi.
                        </AlertDescription>
                    </Alert>
                )}

                {errors.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Klasifikasi gagal</AlertTitle>
                        <AlertDescription>{errors.error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Identitas Pasien</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Nama pasien hanya digunakan sebagai penanda internal dan
                                tidak dikirim ke model klasifikasi.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Field
                                id="nama_lengkap"
                                label="Nama Pasien"
                                error={errors.nama_lengkap}
                                hint="Opsional. Kosongkan bila tidak diperlukan."
                            >
                                <Input
                                    id="nama_lengkap"
                                    value={data.nama_lengkap}
                                    onChange={(e) =>
                                        setData('nama_lengkap', e.target.value)
                                    }
                                />
                            </Field>
                        </CardContent>
                    </Card>

                    {KELOMPOK_VARIABEL.map((kelompok) => (
                        <Card key={kelompok.judul}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {kelompok.judul}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {kelompok.keterangan}
                                </p>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                {kelompok.fields.map((nama) => (
                                    <Fragment key={nama}>
                                        {kelompok.judul === 'Data Pengobatan' &&
                                            nama === 'riwayat_pengobatan' && (
                                                <Field
                                                    id="tanggal_awal_pengobatan"
                                                    label={LABEL.tanggal_awal_pengobatan}
                                                    error={errors.tanggal_awal_pengobatan}
                                                    hint="Dipakai untuk menghitung durasi dan status pengobatan."
                                                    required
                                                >
                                                    <Input
                                                        id="tanggal_awal_pengobatan"
                                                        type="date"
                                                        max={tanggalHariIni()}
                                                        value={data.tanggal_awal_pengobatan}
                                                        onChange={(e) =>
                                                            setData(
                                                                'tanggal_awal_pengobatan',
                                                                e.target.value,
                                                            )
                                                        }
                                                        aria-invalid={Boolean(
                                                            errors.tanggal_awal_pengobatan,
                                                        )}
                                                    />
                                                </Field>
                                            )}

                                        {VARIABEL_NUMERIK.includes(nama) ? (
                                            <Field
                                                id={nama}
                                                label={LABEL[nama]}
                                                error={errors[nama]}
                                                required
                                            >
                                                <Input
                                                    id={nama}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={nama === 'tb' ? 50 : 1}
                                                    max={nama === 'ket_usia' ? 120 : undefined}
                                                    value={data[nama]}
                                                    onChange={(e) =>
                                                        setData(nama, e.target.value)
                                                    }
                                                    aria-invalid={Boolean(errors[nama])}
                                                />
                                            </Field>
                                        ) : (
                                            <SelectField
                                                id={nama}
                                                label={LABEL[nama]}
                                                value={data[nama]}
                                                options={OPSI[nama as keyof typeof OPSI]}
                                                onChange={(nilai) => setData(nama, nilai)}
                                                error={errors[nama]}
                                                required
                                            />
                                        )}
                                    </Fragment>
                                ))}

                                {kelompok.judul === 'Data Pengobatan' && (
                                    <>
                                        <VariabelTurunan
                                            compact
                                            label={LABEL.status_pengobatan}
                                            nilai={statusPengobatan}
                                            keterangan={`Ditentukan dari durasi: ${BATAS_BULAN_PENGOBATAN_LAMA} bulan atau lebih tergolong pengobatan lama.`}
                                        />
                                        <VariabelTurunan
                                            compact
                                            label={LABEL.durasi_pengobatan}
                                            nilai={durasi.label}
                                            keterangan="Dihitung dari tanggal awal pengobatan sampai hari ini."
                                        />
                                    </>
                                )}

                                {kelompok.judul === 'Data Demografis' && (
                                    <VariabelTurunan
                                        label={LABEL.usia}
                                        nilai={kategoriUsia}
                                        keterangan={`Ditentukan dari usia pasien: kurang dari ${BATAS_USIA_LANJUT} tahun tergolong usia produktif.`}
                                    />
                                )}

                                {kelompok.judul === 'Kondisi Fisik' && (
                                    <VariabelTurunan
                                        label={LABEL.imt}
                                        nilai={imt > 0 ? imt.toString() : ''}
                                        keterangan="Dihitung otomatis: berat badan dibagi kuadrat tinggi badan dalam meter."
                                    />
                                )}

                                {kelompok.judul === 'Data Pengobatan' &&
                                    data.efek_samping_obat === 'Ada Keluhan' && (
                                        <div className="sm:col-span-2">
                                            <Field
                                                id="keterangan_efek_samping"
                                                label={LABEL.keterangan_efek_samping}
                                                error={errors.keterangan_efek_samping}
                                                hint="Keterangan bersifat catatan klinis dan tidak digunakan sebagai variabel model."
                                            >
                                                <Textarea
                                                    id="keterangan_efek_samping"
                                                    rows={3}
                                                    value={data.keterangan_efek_samping}
                                                    onChange={(e) =>
                                                        setData(
                                                            'keterangan_efek_samping',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                            {lengkap ? (
                                <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                                <AlertCircle className="size-4 text-muted-foreground" />
                            )}
                            <span className={lengkap ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                                {terisi} dari {totalWajib} variabel terisi
                            </span>
                            {features?.total_features && (
                                <Badge variant="secondary">
                                    {features.total_features} variabel model
                                </Badge>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={processing || mlServiceStatus === 'disconnected'}
                        >
                            {processing && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            {processing ? 'Memproses...' : 'Lakukan Klasifikasi'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
