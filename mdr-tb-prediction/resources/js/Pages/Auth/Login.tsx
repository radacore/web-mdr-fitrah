import { Field } from '@/ShadcnComponents/Field';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import { Badge } from '@/ShadcnComponents/ui/badge';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { Checkbox } from '@/ShadcnComponents/ui/checkbox';
import { Input } from '@/ShadcnComponents/ui/input';
import { Label } from '@/ShadcnComponents/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { FormEventHandler } from 'react';

/*
 * Akun bawaan dari database/seeders/DatabaseSeeder.php yang ditampilkan
 * sebagai bantuan demonstrasi. Blok ini hanya untuk keperluan demo: hapus
 * konstanta AKUN_DEMO beserta kartu "Akun Demo" di bawah formulir sebelum
 * aplikasi dipasang pada lingkungan produksi.
 */
const AKUN_DEMO = [
    { peran: 'Admin', email: 'admin@mdrtb.test', password: 'password' },
    {
        peran: 'Tenaga Medis',
        email: 'tenagamedis@mdrtb.test',
        password: 'password',
    },
] as const;

interface Props {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
            <Head title="Masuk" />

            <div className="flex min-h-svh">
                <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2">
                    <div className="relative z-10 flex w-full flex-col justify-between p-12 text-primary-foreground">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
                                <Activity className="size-5" />
                            </div>
                            <span className="text-lg font-semibold tracking-tight">
                                Klasifikasi MDR-TB
                            </span>
                        </div>

                        <div className="max-w-md">
                            <h1 className="text-3xl font-bold leading-tight">
                                Klasifikasi Keberhasilan Pengobatan Pasien MDR-TB
                            </h1>
                            <p className="mt-4 leading-relaxed text-primary-foreground/80">
                                Sistem pendukung keputusan berbasis teknik SMOTE dan
                                algoritma Random Forest untuk membantu tenaga medis
                                mengidentifikasi pasien yang berisiko gagal pengobatan
                                secara lebih dini.
                            </p>
                        </div>

                        <dl className="flex flex-wrap gap-8">
                            {[
                                ['17', 'Variabel Klinis'],
                                ['SMOTE', 'Penyeimbangan Data'],
                                ['5-Fold', 'Cross Validation'],
                            ].map(([nilai, label]) => (
                                <div key={label}>
                                    <dt className="text-2xl font-bold">{nilai}</dt>
                                    <dd className="text-sm text-primary-foreground/70">
                                        {label}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </aside>

                <main className="flex w-full flex-col items-center justify-center bg-muted/40 p-6 md:p-10 lg:w-1/2">
                    <div className="w-full max-w-sm space-y-6">
                        <div className="flex items-center justify-center gap-2 lg:hidden">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Activity className="size-5" />
                            </div>
                            <span className="font-semibold">Klasifikasi MDR-TB</span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-semibold">Masuk</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Gunakan akun yang telah didaftarkan oleh admin.
                            </p>
                        </div>

                        {status && (
                            <Alert>
                                <CheckCircle2 className="size-4" />
                                <AlertDescription>{status}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            <Field id="email" label="Email" error={errors.email} required>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nama@email.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    aria-invalid={Boolean(errors.email)}
                                />
                            </Field>

                            <Field
                                id="password"
                                label="Kata Sandi"
                                error={errors.password}
                                required
                            >
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errors.password)}
                                />
                            </Field>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={data.remember}
                                        onCheckedChange={(nilai) =>
                                            setData('remember', nilai === true)
                                        }
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="text-sm font-normal text-muted-foreground"
                                    >
                                        Ingat saya
                                    </Label>
                                </div>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        Lupa kata sandi?
                                    </Link>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="h-11 w-full"
                                disabled={processing}
                            >
                                {processing ? 'Memproses...' : 'Masuk'}
                            </Button>
                        </form>

                        <Card className="border-dashed">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                                    Akun Demo
                                    <Badge variant="secondary">Demo</Badge>
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Kredensial bawaan untuk keperluan demonstrasi.
                                    Pilih salah satu akun untuk mengisi formulir secara
                                    otomatis.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {AKUN_DEMO.map((akun) => (
                                    <button
                                        key={akun.email}
                                        type="button"
                                        onClick={() => {
                                            setData('email', akun.email);
                                            setData('password', akun.password);
                                        }}
                                        className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {akun.peran}
                                            </span>
                                            <span className="text-xs text-primary">
                                                Isi otomatis
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                                            {akun.email} · {akun.password}
                                        </span>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
}
