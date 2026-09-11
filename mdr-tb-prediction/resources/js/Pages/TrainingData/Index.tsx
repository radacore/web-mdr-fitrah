import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/ShadcnComponents/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ShadcnComponents/ui/table';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { DeleteConfirmModal } from '@/ShadcnComponents/DeleteConfirmModal';
import { useState } from 'react';
import { Plus, Search, Trash2, Edit, RefreshCw, Database, CheckCircle2, AlertCircle, Brain, FlaskConical, Percent, SplitSquareVertical, Columns3, Cpu, Filter } from 'lucide-react';
import { toast } from 'sonner';
import TerminalRetrainModal from '@/ShadcnComponents/TerminalRetrainModal';

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
    created_at: string;
}

interface Props {
    trainingData: {
        data: TrainingDataItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search?: string;
        outcome?: string;
    };
    stats: {
        total: number;
        berhasil: number;
        tidak_berhasil: number;
        data_training: number;
        data_validation: number;
        data_testing: number;
        jumlah_fitur: number;
        model_aktif: number;
    };
}

export default function Index({ trainingData, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isRetraining, setIsRetraining] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [useSMOTE, setUseSMOTE] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('training-data.index'), { search }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteId) return;

        setIsDeleting(true);
        router.delete(route('training-data.destroy', deleteId), {
            onSuccess: () => {
                toast.success('Data training berhasil dihapus');
                setDeleteId(null);
            },
            onError: () => {
                toast.error('Gagal menghapus data training');
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleRetrain = (withSMOTE: boolean) => {
        setUseSMOTE(withSMOTE);
        setShowTerminal(true);
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Data Training' }]}>
            <Head title="Data Training" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Card 1: Distribusi Data */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Data</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-3">{stats.total}</div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Berhasil</span>
                                    </div>
                                    <span className="font-semibold text-green-600">{stats.berhasil}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span>Tidak Berhasil</span>
                                    </div>
                                    <span className="font-semibold text-red-600">{stats.tidak_berhasil}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Pembagian Data */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pembagian Data</CardTitle>
                            <Brain className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="mb-3 text-xs text-muted-foreground">
                                Pembagian dihitung dari total data mentah ({stats.total} baris) memakai
                                rumus split yang sama dengan model (test 15%, validation 15%, training sisanya).
                                Saat training berjalan, ML service melakukan pembersihan tambahan
                                (drop missing value &amp; outlier IQR) sehingga jumlah baris yang
                                benar-benar dipakai untuk melatih model bisa lebih kecil dari {stats.total}
                                (lihat halaman Komparasi SMOTE).
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                                        <span>Training</span>
                                    </div>
                                    <span className="font-semibold text-purple-600">70% <span className="text-muted-foreground font-normal">({stats.data_training})</span></span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                                        <span>Validation</span>
                                    </div>
                                    <span className="font-semibold text-orange-600">15% <span className="text-muted-foreground font-normal">({stats.data_validation})</span></span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                                        <span>Testing</span>
                                    </div>
                                    <span className="font-semibold text-purple-600">15% <span className="text-muted-foreground font-normal">({stats.data_testing})</span></span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Actions */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                                <Input
                                    type="text"
                                    placeholder="Cari data..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button type="submit" variant="outline">
                                    <Search className="h-4 w-4 mr-2" />
                                    Cari
                                </Button>
                            </form>
                            <div className="flex gap-2 flex-wrap">
                                <Link href={route('training-data.cleaning')}>
                                    <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Pembersihan Data
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRetrain(false)}
                                    disabled={isRetraining}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isRetraining ? 'animate-spin' : ''}`} />
                                    Retrain Tanpa SMOTE
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRetrain(true)}
                                    disabled={isRetraining}
                                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isRetraining ? 'animate-spin' : ''}`} />
                                    Retrain Dengan SMOTE
                                </Button>
                                <Link href={route('training-data.create')}>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Tambah Data
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No</TableHead>
                                        <TableHead>Usia</TableHead>
                                        <TableHead>JK</TableHead>
                                        <TableHead>BB/TB</TableHead>
                                        <TableHead>Status Gizi</TableHead>
                                        <TableHead>Merokok</TableHead>
                                        <TableHead>Kepatuhan</TableHead>
                                        <TableHead>Hasil</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trainingData.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                Tidak ada data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        trainingData.data.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {(trainingData.current_page - 1) * trainingData.per_page + index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div className="font-medium">{item.ket_usia} tahun</div>
                                                        <div className="text-muted-foreground">{item.usia}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{item.jenis_kelamin === 'Laki-Laki' ? 'L' : 'P'}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {item.bb}kg / {item.tb}cm
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        item.status_gizi === 'Gizi Normal' ? 'default' :
                                                            item.status_gizi === 'Gizi Kurang' ? 'destructive' : 'secondary'
                                                    }>
                                                        {item.status_gizi}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{item.status_merokok === 'Merokok' ? 'Ya' : 'Tidak'}</TableCell>
                                                <TableCell>{item.kepatuhan_minum_obat}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.keberhasilan_pengobatan === 'Berhasil' ? 'default' : 'destructive'}>
                                                        {item.keberhasilan_pengobatan}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link href={route('training-data.edit', item.id)}>
                                                            <Button variant="outline" size="sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setDeleteId(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {trainingData.last_page > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                                {trainingData.links.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <DeleteConfirmModal
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Data Training"
                description="Apakah Anda yakin ingin menghapus data training ini? Tindakan ini tidak dapat dibatalkan."
                isLoading={isDeleting}
            />

            <TerminalRetrainModal
                open={showTerminal}
                onClose={() => setShowTerminal(false)}
                totalData={stats.total}
                useSMOTE={useSMOTE}
            />
        </AppLayout>
    );
}

