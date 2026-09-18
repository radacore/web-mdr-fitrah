import { Field } from '@/ShadcnComponents/Field';
import { Button } from '@/ShadcnComponents/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/ShadcnComponents/ui/card';
import { Input } from '@/ShadcnComponents/ui/input';
import { useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

export default function UpdatePasswordForm() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } =
        useForm({
            current_password: '',
            password: '',
            password_confirmation: '',
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (galat) => {
                if (galat.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (galat.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Ubah Kata Sandi</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Gunakan kata sandi yang panjang dan sulit ditebak untuk menjaga
                    keamanan data rekam medis.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <Field
                        id="current_password"
                        label="Kata Sandi Saat Ini"
                        error={errors.current_password}
                        required
                    >
                        <Input
                            id="current_password"
                            ref={currentPasswordInput}
                            type="password"
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            autoComplete="current-password"
                            aria-invalid={Boolean(errors.current_password)}
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
                            ref={passwordInput}
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.password)}
                        />
                    </Field>

                    <Field
                        id="password_confirmation"
                        label="Konfirmasi Kata Sandi Baru"
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

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Ubah Kata Sandi'}
                        </Button>
                        {recentlySuccessful && (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-4" />
                                Kata sandi diperbarui
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
