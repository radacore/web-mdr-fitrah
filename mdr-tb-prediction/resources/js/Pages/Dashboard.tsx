import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Button } from '@/ShadcnComponents/ui/button';
import { Activity, History, BarChart3, Database, ArrowRight, Stethoscope } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface ActiveModel {
    id: number;
    model_name: string;
    is_active: boolean;
}

export default function Dashboard() {
    const [activeModels, setActiveModels] = useState<string>('Logistic Regression, Decision Tree, KNN, dan SVM');

    useEffect(() => {
        axios.get('/api/active-models')
            .then(res => {
                const active = res.data.filter((m: ActiveModel) => m.is_active).map((m: ActiveModel) => m.model_name);
                if (active.length > 0) {
                    if (active.length === 1) {
                        setActiveModels(active[0]);
                    } else if (active.length === 2) {
                        setActiveModels(active.join(' dan '));
                    } else {
                        const last = active.pop();
                        setActiveModels(active.join(', ') + ', dan ' + last);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch active models", err));
    }, []);
    const quickLinks = [
        {
            title: 'Prediksi Baru',
            description: 'Lakukan prediksi keberhasilan pengobatan MDR-TB',
            icon: Activity,
            href: '/prediction',
            color: 'from-purple-600 to-purple-400',
        },
        {
            title: 'Riwayat Prediksi',
            description: 'Lihat histori prediksi yang pernah dilakukan',
            icon: History,
            href: '/prediction/history',
            color: 'from-green-600 to-green-400',
        },
        {
            title: 'Statistik Model',
            description: 'Analisis performa model machine learning',
            icon: BarChart3,
            href: '/prediction/statistics',
            color: 'from-purple-600 to-purple-400',
        },
        {
            title: 'Data Training',
            description: 'Kelola data training untuk model ML',
            icon: Database,
            href: '/training-data',
            color: 'from-orange-600 to-orange-400',
        },
    ];

    return (
        <AppLayout breadcrumbs={[{ label: 'Dashboard' }]}>
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Welcome Card */}
                <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                                <Stethoscope className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Selamat Datang! 👋</CardTitle>
                                <CardDescription>
                                    Sistem Prediksi Keberhasilan Pengobatan MDR-TB menggunakan Machine Learning
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Aplikasi ini menggunakan algoritma {activeModels} untuk memprediksi keberhasilan pengobatan MDR-TB berdasarkan data pasien.
                        </p>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {quickLinks.map((item) => (
                        <Card key={item.title} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}>
                                    <item.icon className="h-5 w-5 text-white" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <CardTitle className="text-lg">{item.title}</CardTitle>
                                <CardDescription className="text-sm">{item.description}</CardDescription>
                                <Link href={item.href}>
                                    <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto text-primary group-hover:gap-2 transition-all">
                                        Buka
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Info Section */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tentang MDR-TB</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <p>
                                <strong>Multi-Drug Resistant Tuberculosis (MDR-TB)</strong> adalah jenis tuberkulosis
                                yang resisten terhadap obat-obatan TB lini pertama.
                            </p>
                            <p>
                                Pengobatan MDR-TB membutuhkan waktu lebih lama (18-24 bulan)
                                dan memiliki tingkat keberhasilan yang bervariasi.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Cara Menggunakan</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-2">
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Masukkan data pasien pada halaman <strong>Prediksi</strong></li>
                                <li>Sistem akan memprediksi keberhasilan pengobatan</li>
                                <li>Lihat histori prediksi di halaman <strong>Riwayat</strong></li>
                                <li>Analisis performa model di halaman <strong>Statistik</strong></li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
