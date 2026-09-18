import AppLayout from '@/Layouts/AppLayout';
import { DeleteConfirmModal } from '@/ShadcnComponents/DeleteConfirmModal';
import { Pagination } from '@/ShadcnComponents/Pagination';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ShadcnComponents/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ShadcnComponents/ui/table';
import { PageProps, Paginated, Role, User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props extends PageProps {
    users: Paginated<User>;
    filters: { search?: string; role?: string };
    roles: Record<Role, string>;
    stats: { total: number; admin: number; tenaga_medis: number };
}

export default function Index({ users, filters, roles, stats, auth }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [target, setTarget] = useState<User | null>(null);

    const terapkanFilter = (perubahan: Record<string, string | undefined>) => {
        router.get(
            route('users.index'),
            { search, role: filters.role, ...perubahan },
            { preserveState: true, replace: true },
        );
    };

    const hapus = () => {
        if (!target) return;
        router.delete(route('users.destroy', target.id), {
            onFinish: () => setTarget(null),
        });
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Manajemen Akun' }]}>
            <Head title="Manajemen Akun" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Manajemen Akun</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola akun admin dan tenaga medis yang dapat mengakses sistem.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={route('users.create')}>
                            <Plus className="mr-2 size-4" />
                            Tambah Akun
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Total Akun', nilai: stats.total },
                        { label: 'Admin', nilai: stats.admin },
                        { label: 'Tenaga Medis', nilai: stats.tenaga_medis },
                    ].map((item) => (
                        <Card key={item.label}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {item.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold tabular-nums">
                                    {item.nilai}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">Daftar Akun</CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    terapkanFilter({});
                                }}
                                className="relative"
                            >
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama atau email"
                                    className="w-52 pl-8"
                                    aria-label="Cari akun"
                                />
                            </form>
                            <Select
                                value={filters.role ?? 'semua'}
                                onValueChange={(nilai) =>
                                    terapkanFilter({
                                        role: nilai === 'semua' ? undefined : nilai,
                                    })
                                }
                            >
                                <SelectTrigger className="w-40" aria-label="Filter peran">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="semua">Semua Peran</SelectItem>
                                    {Object.entries(roles).map(([nilai, label]) => (
                                        <SelectItem key={nilai} value={nilai}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Peran</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                Tidak ada akun yang cocok dengan pencarian.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {users.data.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                {user.name}
                                                {user.id === auth.user.id && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        (Anda)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {user.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        user.role === 'admin'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {roles[user.role]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={route(
                                                                'users.edit',
                                                                user.id,
                                                            )}
                                                            aria-label={`Ubah akun ${user.name}`}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setTarget(user)}
                                                        disabled={
                                                            user.id === auth.user.id
                                                        }
                                                        aria-label={`Hapus akun ${user.name}`}
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {users.last_page > 1 && (
                            <Pagination
                                links={users.links}
                                from={users.from}
                                to={users.to}
                                total={users.total}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <DeleteConfirmModal
                open={Boolean(target)}
                onOpenChange={(open) => !open && setTarget(null)}
                onConfirm={hapus}
                title="Hapus Akun"
                description={`Akun ${target?.name ?? ''} akan dihapus permanen beserta seluruh riwayat klasifikasinya. Tindakan ini tidak dapat dibatalkan.`}
            />
        </AppLayout>
    );
}
