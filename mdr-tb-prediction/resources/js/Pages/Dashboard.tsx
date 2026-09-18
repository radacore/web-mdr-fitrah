import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Database,
    FlaskConical,
    History,
    Scale,
    Users,
} from 'lucide-react';

interface Menu {
    judul: string;
    keterangan: string;
    icon: typeof Activity;
    href: string;
    adminSaja?: boolean;
}

const MENU: Menu[] = [
    {
        judul: 'Klasifikasi Pasien',
        keterangan:
            'Masukkan data rekam medis pasien untuk memperoleh klasifikasi keberhasilan pengobatan.',
        icon: Activity,
        href: '/prediction',
    },
    {
        judul: 'Riwayat Klasifikasi',
        keterangan: 'Lihat kembali hasil klasifikasi yang telah dilakukan.',
        icon: History,
        href: '/prediction/history',
    },
    {
        judul: 'Evaluasi Model',
        keterangan:
            'Confusion matrix, metrik evaluasi, dan feature importance model Random Forest.',
        icon: BarChart3,
        href: '/prediction/statistics',
    },
    {
        judul: 'Pengujian SMOTE',
        keterangan:
            'Bandingkan performa model dengan dan tanpa penyeimbangan data SMOTE.',
        icon: Scale,
        href: '/prediction/compare-smote',
        adminSaja: true,
    },
    {
        judul: 'Skenario Pengujian',
        keterangan:
            'Variasi proporsi pembagian data dan jumlah pohon pada Random Forest.',
        icon: FlaskConical,
        href: '/prediction/test-scenarios',
        adminSaja: true,
    },
    {
        judul: 'Data Rekam Medis',
        keterangan: 'Kelola dataset rekam medis yang digunakan untuk melatih model.',
        icon: Database,
        href: '/training-data',
        adminSaja: true,
    },
    {
        judul: 'Manajemen Akun',
        keterangan: 'Kelola akun admin dan tenaga medis yang dapat mengakses sistem.',
        icon: Users,
        href: '/users',
        adminSaja: true,
    },
];

export default function Dashboard({ auth }: PageProps) {
    const menu = MENU.filter((item) => !item.adminSaja || auth.user.is_admin);

    return (
        <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
            <Head title="Dashboard" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Selamat datang, {auth.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Sistem klasifikasi keberhasilan pengobatan pasien MDR-TB
                        menggunakan teknik SMOTE dan algoritma Random Forest.
                    </p>
                    <Badge variant="secondary" className="mt-2">
                        {auth.user.role_label}
                    </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {menu.map((item) => (
                        <Card key={item.href} className="flex flex-col">
                            <CardHeader>
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <item.icon className="size-5" />
                                </div>
                                <CardTitle className="mt-3 text-base">
                                    {item.judul}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between gap-4">
                                <p className="text-sm text-muted-foreground">
                                    {item.keterangan}
                                </p>
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href={item.href}>Buka</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tentang Sistem</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            Sistem ini mengklasifikasikan pasien MDR-TB berdasarkan potensi
                            keberhasilan atau kegagalan pengobatan menggunakan 17 variabel
                            klinis dan demografis dari data rekam medis.
                        </p>
                        <p>
                            Ketidakseimbangan kelas ditangani dengan teknik SMOTE yang
                            membangkitkan sampel sintetis pada kelas minoritas, sehingga
                            model lebih sensitif dalam mendeteksi pasien yang berisiko gagal
                            pengobatan.
                        </p>
                        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs">
                            Hasil klasifikasi merupakan alat bantu pendukung keputusan.
                            Keputusan klinis akhir tetap berada pada tenaga medis yang
                            memiliki pengetahuan dan pengalaman menangani pasien.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
