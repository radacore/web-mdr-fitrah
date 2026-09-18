import GuestLayout from '@/Layouts/GuestLayout';
import { Field } from '@/ShadcnComponents/Field';
import { Alert, AlertDescription } from '@/ShadcnComponents/ui/alert';
import { Button } from '@/ShadcnComponents/ui/button';
import { Input } from '@/ShadcnComponents/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa Kata Sandi" />

            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-semibold">Lupa Kata Sandi</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Masukkan alamat email akun Anda. Tautan untuk mengatur ulang kata
                        sandi akan dikirim ke email tersebut.
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
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="username"
                            autoFocus
                            aria-invalid={Boolean(errors.email)}
                        />
                    </Field>

                    <div className="flex items-center justify-between gap-3">
                        <Link
                            href={route('login')}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            Kembali ke halaman masuk
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Mengirim...' : 'Kirim Tautan'}
                        </Button>
                    </div>
                </form>
            </div>
        </GuestLayout>
    );
}
