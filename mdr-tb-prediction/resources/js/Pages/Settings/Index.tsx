import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Label } from '@/ShadcnComponents/ui/label';
import { Switch } from '@/ShadcnComponents/ui/switch';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface ActiveModel {
    id: number;
    model_name: string;
    is_active: boolean;
}

export default function Index() {
    const [models, setModels] = useState<ActiveModel[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/active-models');
            setModels(response.data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Gagal memuat daftar pengaturan model.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleModel = async (modelName: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

        // Optimistic UI update
        setModels(models.map(m =>
            m.model_name === modelName ? { ...m, is_active: newStatus } : m
        ));

        try {
            await axios.post('/api/active-models', {
                model_name: modelName,
                is_active: newStatus
            });
            toast({
                title: 'Berhasil',
                description: `Pengaturan model ${modelName} berhasil disimpan.`,
            });
        } catch (error) {
            // Revert on failure
            setModels(models.map(m =>
                m.model_name === modelName ? { ...m, is_active: currentStatus } : m
            ));
            toast({
                title: 'Error',
                description: 'Gagal memperbarui pengaturan model.',
                variant: 'destructive',
            });
        }
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Pengaturan Sistem' }]}>
            <Head title="Pengaturan Sistem" />

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pengaturan Model Machine Learning</CardTitle>
                        <CardDescription>
                            Pilih model mana saja yang boleh muncul sebagai pilihan di form Prediksi (bagi pengguna Dasbor maupun Tamu Publik).
                            Anda dapat mengaktifkan lebih dari satu model.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4 text-gray-500 text-sm">Memuat pengaturan...</div>
                        ) : (
                            <div className="space-y-6">
                                {models.map((model) => (
                                    <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-semibold">{model.model_name}</Label>
                                            <div className="text-sm text-gray-500">
                                                {model.is_active ? 'Model saat ini aktif dan bisa dipilih.' : 'Model disembunyikan dari dropdown pengguna.'}
                                            </div>
                                        </div>
                                        <Switch
                                            checked={model.is_active}
                                            onCheckedChange={() => toggleModel(model.model_name, model.is_active)}
                                        />
                                    </div>
                                ))}
                                {models.length === 0 && (
                                    <div className="text-center py-4 text-gray-500 text-sm italic">
                                        Tidak ada data model di database. Jalankan `php artisan db:seed`.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
