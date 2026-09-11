import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ShadcnComponents/ui/table';
import { DeleteConfirmModal } from '@/ShadcnComponents/DeleteConfirmModal';
import { Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import { getDecodedValue } from './Show';

interface Prediction {
    id: number;
    slug: string | null;
    prediction_result: string;
    model_used: string;
    confidence_score: number;
    created_at: string;
    patient_data: Record<string, string>;
}

interface PaginatedPredictions {
    data: Prediction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    predictions: PaginatedPredictions;
}

export default function History({ predictions }: Props) {
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deleteId) return;

        setIsDeleting(true);
        router.delete(route('prediction.destroy', deleteId), {
            onSuccess: () => {
                toast.success('Data prediksi berhasil dihapus');
                setDeleteId(null);
            },
            onError: () => {
                toast.error('Gagal menghapus data prediksi');
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Riwayat' }]}>
            <Head title="Riwayat Prediksi" />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Riwayat Prediksi</CardTitle>
                    <Button asChild>
                        <Link href={route('prediction.index')}>+ Prediksi Baru</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {predictions.data.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Belum ada riwayat prediksi. <Link href={route('prediction.index')} className="text-purple-600 hover:underline">Buat prediksi pertama Anda</Link>.
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Hasil Prediksi</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Confidence</TableHead>
                                        <TableHead>Sumber</TableHead>
                                        <TableHead>Usia</TableHead>
                                        <TableHead>Jenis Kelamin</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {predictions.data.map((prediction, index) => (
                                        <TableRow key={prediction.id}>
                                            <TableCell>
                                                {(predictions.current_page - 1) * predictions.per_page + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(prediction.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${prediction.prediction_result === 'Berhasil'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                    {prediction.prediction_result}
                                                </span>
                                            </TableCell>
                                            <TableCell>{prediction.model_used}</TableCell>
                                            <TableCell>{prediction.confidence_score.toFixed(1)}%</TableCell>
                                            <TableCell>
                                                {prediction.slug
                                                    ? <Badge variant="secondary" className="text-xs">Guest</Badge>
                                                    : <Badge variant="outline" className="text-xs">User</Badge>
                                                }
                                            </TableCell>
                                            <TableCell>{getDecodedValue('ket_usia', prediction.patient_data.ket_usia ?? prediction.patient_data['Ket.Usia'] ?? '')}</TableCell>
                                            <TableCell>{getDecodedValue('jenis_kelamin', prediction.patient_data.jenis_kelamin ?? prediction.patient_data['Jenis Kelamin'] ?? '')}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 items-center">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('prediction.show', prediction.id)}>Detail</Link>
                                                    </Button>
                                                    {prediction.slug && (
                                                        <a href={`/hasil/${prediction.slug}`} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="ghost" size="sm" title="Buka link publik">
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        </a>
                                                    )}
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setDeleteId(prediction.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {predictions.last_page > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    {predictions.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={!!link.url}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <DeleteConfirmModal
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Prediksi"
                description="Apakah Anda yakin ingin menghapus data prediksi ini? Tindakan ini tidak dapat dibatalkan."
                isLoading={isDeleting}
            />
        </AppLayout>
    );
}
