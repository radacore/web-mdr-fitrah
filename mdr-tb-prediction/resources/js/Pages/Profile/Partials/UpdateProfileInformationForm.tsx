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
import { FormEventHandler } from 'react';

interface Props {
    user: { name: string; email: string };
}

export default function UpdateProfileInformationForm({ user }: Props) {
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Informasi Akun</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Perbarui nama dan alamat email akun Anda.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
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
                            autoComplete="username"
                            aria-invalid={Boolean(errors.email)}
                        />
                    </Field>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                        {recentlySuccessful && (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-4" />
                                Tersimpan
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
