import AppLayout from '@/Layouts/AppLayout';
import { Field, SelectField } from '@/ShadcnComponents/Field';
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
    BATAS_USIA_LANJUT,
    KELOMPOK_VARIABEL,
    LABEL,
    OPSI,
    hitungImt,
    tentukanKategoriUsia,
} from '@/lib/variabel';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

export interface TrainingDataRecord {
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

interface FormData {
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
    keberhasilan_pengobatan: string;
    [key: string]: string;
}

const VARIABEL_NUMERIK = ['ket_usia', 'bb', 'tb'];

export function TrainingDataForm({ record }: { record?: TrainingDataRecord }) {
    const isEdit = Boolean(record);

    const { data, setData, post, put, processing, errors } = useForm<FormData>({
        ket_usia: record?.ket_usia?.toString() ?? '',
        jenis_kelamin: record?.jenis_kelamin ?? '',
        status_bekerja: record?.status_bekerja ?? '',
        bb: record?.bb?.toString() ?? '',
        tb: record?.tb?.toString() ?? '',
        status_gizi: record?.status_gizi ?? '',
        status_merokok: record?.status_merokok ?? '',
        pemeriksaan_kontak: record?.pemeriksaan_kontak ?? '',
        riwayat_dm: record?.riwayat_dm ?? '',
        riwayat_hiv: record?.riwayat_hiv ?? '',
        komorbiditas: record?.komorbiditas ?? '',
        kepatuhan_minum_obat: record?.kepatuhan_minum_obat ?? '',
        efek_samping_obat: record?.efek_samping_obat ?? '',
        keterangan_efek_samping: record?.keterangan_efek_samping ?? '',
        riwayat_pengobatan: record?.riwayat_pengobatan ?? '',
        panduan_pengobatan: record?.panduan_pengobatan ?? '',
        keberhasilan_pengobatan: record?.keberhasilan_pengobatan ?? '',
    });

    const imt = useMemo(() => hitungImt(data.bb, data.tb), [data.bb, data.tb]);
    const kategoriUsia = useMemo(
        () => tentukanKategoriUsia(data.ket_usia),
        [data.ket_usia],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && record) {
            put(route('training-data.update', record.id));
        } else {
            post(route('training-data.store'));
        }
    };

    const judul = isEdit ? 'Ubah Data Rekam Medis' : 'Tambah Data Rekam Medis';

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Data Rekam Medis', href: route('training-data.index') },
                { label: judul },
            ]}
        >
            <Head title={judul} />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={route('training-data.index')} aria-label="Kembali">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">{judul}</h1>
                        <p className="text-sm text-muted-foreground">
                            Lengkapi 17 variabel penelitian beserta hasil akhir pengobatan
                            sebagai label kelas.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
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
                                {kelompok.fields.map((nama) =>
                                    VARIABEL_NUMERIK.includes(nama) ? (
                                        <Field
                                            key={nama}
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
                                            key={nama}
                                            id={nama}
                                            label={LABEL[nama]}
                                            value={data[nama]}
                                            options={OPSI[nama as keyof typeof OPSI]}
                                            onChange={(nilai) => setData(nama, nilai)}
                                            error={errors[nama]}
                                            required
                                        />
                                    ),
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
                                        keterangan="Dihitung otomatis dan disimpan bersama data."
                                    />
                                )}

                                {kelompok.judul === 'Data Pengobatan' &&
                                    data.efek_samping_obat === 'Ada Keluhan' && (
                                        <div className="sm:col-span-2">
                                            <Field
                                                id="keterangan_efek_samping"
                                                label={LABEL.keterangan_efek_samping}
                                                error={errors.keterangan_efek_samping}
                                                hint="Catatan klinis, tidak digunakan sebagai variabel model."
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

                    <Card className="border-primary/40">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Variabel Target
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Hasil akhir pengobatan yang menjadi label kelas pada proses
                                klasifikasi.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <SelectField
                                id="keberhasilan_pengobatan"
                                label={LABEL.keberhasilan_pengobatan}
                                value={data.keberhasilan_pengobatan}
                                options={OPSI.keberhasilan_pengobatan}
                                onChange={(nilai) =>
                                    setData('keberhasilan_pengobatan', nilai)
                                }
                                error={errors.keberhasilan_pengobatan}
                                required
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('training-data.index')}>Batal</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
