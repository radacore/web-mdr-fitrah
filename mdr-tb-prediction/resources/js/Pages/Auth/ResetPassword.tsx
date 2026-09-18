import GuestLayout from '@/Layouts/GuestLayout';
import { Field } from '@/ShadcnComponents/Field';
import { Button } from '@/ShadcnComponents/ui/button';
import { Input } from '@/ShadcnComponents/ui/input';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Atur Ulang Kata Sandi" />

            <div className="space-y-4">
                <div>
                    <h1 className="text-lg font-semibold">Atur Ulang Kata Sandi</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tentukan kata sandi baru untuk akun Anda.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <Field id="email" label="Email" error={errors.email} required>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="username"
                            aria-invalid={Boolean(errors.email)}
                        />
                    </Field>

                    <Field
                        id="password"
                        label="Kata Sandi Baru"
                        error={errors.password}
                        hint="Minimal 8 karakter."
                        required
                    >
                        <Input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            autoComplete="new-password"
                            autoFocus
                            aria-invalid={Boolean(errors.password)}
                        />
                    </Field>

                    <Field
                        id="password_confirmation"
                        label="Konfirmasi Kata Sandi"
                        error={errors.password_confirmation}
                        required
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

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Menyimpan...' : 'Atur Ulang Kata Sandi'}
                    </Button>
                </form>
            </div>
        </GuestLayout>
    );
}
