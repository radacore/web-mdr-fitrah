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
import { Role } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface UserForm {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: Role | '';
    [key: string]: string;
}

interface Props {
    roles: Record<Role, string>;
    /** Bila disertakan, formulir berjalan dalam mode ubah data */
    user?: { id: number; name: string; email: string; role: Role };
}

export function UserForm({ roles, user }: Props) {
    const isEdit = Boolean(user);

    const { data, setData, post, put, processing, errors } = useForm<UserForm>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role: user?.role ?? 'tenaga_medis',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && user) {
            put(route('users.update', user.id));
        } else {
            post(route('users.store'));
        }
    };

    const judul = isEdit ? 'Ubah Akun' : 'Tambah Akun';

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Manajemen Akun', href: route('users.index') },
                { label: judul },
            ]}
        >
            <Head title={judul} />

            <div className="mx-auto max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={route('users.index')} aria-label="Kembali">
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">{judul}</h1>
                        <p className="text-sm text-muted-foreground">
                            {isEdit
                                ? 'Perbarui data akun. Kosongkan kata sandi bila tidak ingin mengubahnya.'
                                : 'Buat akun baru untuk admin atau tenaga medis.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Data Akun</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Field id="name" label="Nama Lengkap" error={errors.name} required>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoComplete="name"
                                    aria-invalid={Boolean(errors.name)}
                                />
                            </Field>

                            <Field id="email" label="Email" error={errors.email} required>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="email"
                                    aria-invalid={Boolean(errors.email)}
                                />
                            </Field>

                            <SelectField
                                id="role"
                                label="Peran"
                                value={data.role}
                                options={roles}
                                onChange={(nilai) => setData('role', nilai as Role)}
                                error={errors.role}
                                hint="Admin dapat mengelola akun dan data rekam medis. Tenaga medis hanya melakukan klasifikasi."
                                required
                            />

                            <Field
                                id="password"
                                label="Kata Sandi"
                                error={errors.password}
                                hint={
                                    isEdit
                                        ? 'Kosongkan bila tidak ingin mengubah kata sandi.'
                                        : 'Minimal 8 karakter.'
                                }
                                required={!isEdit}
                            >
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(errors.password)}
                                />
                            </Field>

                            <Field
                                id="password_confirmation"
                                label="Konfirmasi Kata Sandi"
                                required={!isEdit}
                            >
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) =>
                                        setData('password_confirmation', e.target.value)
                                    }
                                    autoComplete="new-password"
                                />
                            </Field>
                        </CardContent>
                    </Card>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('users.index')}>Batal</Link>
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
